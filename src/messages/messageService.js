import { createClient } from "@supabase/supabase-js";
import { query } from "../db.js";
import { textConversions } from "../utils/deltaPlain.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const getPagination = (page, size) => {
  const from = (page - 1) * size; // 0 based indexing
  const to = from + size - 1; // supabase range is inclusive
  return { from, to };
};

async function findRowNumber({ message_id, userId }) {
  const error = { status: 400, statusText: "Database error when finding message row number" };
  const q = `
    WITH ranked_table AS (
      SELECT
        id,
        user_id,
        created_at,
        RANK() OVER (
          PARTITION BY user_id
          ORDER BY created_at DESC
        ) AS exact_row_num
      FROM
        messages
      WHERE
        user_id = $2
    )
    SELECT exact_row_num
    FROM ranked_table
    WHERE id = $1;
    `;
  try {
    // will return 1 based indexing
    const { rows } = await query(q, [message_id, userId]);
    console.log({
      rows: rows,
    });
    if (rows[0]?.exact_row_num) {
      return {
        row_number: rows[0].exact_row_num,
      };
    } else {
      return { error };
    }
  } catch (e) {
    console.log({ error: "Database error when finding message row number" });
    return { error };
  }
}

export async function getMessages({ userId, page = 1, pageSize = 10, message_id }) {
  if (message_id) {
    const { row_number, error } = await findRowNumber({ message_id, userId });

    if (error) {
      return { error };
    }

    page = Math.ceil(parseInt(row_number) / pageSize);
  }

  const { from, to } = getPagination(page, pageSize);
  const { data, count, error } = await supabase
    .from("messages")
    .select(`*, links(*), attachments(*), voice_messages(*)`, {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    data: {
      messages: data,
      pagination: {
        current_page: page,
        page_size: pageSize,
        total_pages: (() => {
          const safeCount = count ?? 0;
          const safePageSize = pageSize > 0 ? pageSize : 1;
          return Math.ceil(safeCount / safePageSize);
        })(),
      },
    },
    error,
  };
}

export async function createMessage({
  userId,
  temp_id,
  text_content: textContent,
  file_attachments,
  images,
  voice_message,
  delta_content: deltaContent,
}) {
  const { text_content, delta_content } = textConversions({ textContent, deltaContent });
  let links = extractLinks(text_content);

  const attachment_types = [];
  if (file_attachments?.length > 0) attachment_types.push("file");
  if (images?.length > 0) attachment_types.push("image");
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .upsert({
      user_id: userId,
      text_content,
      delta_content,
      temp_id,
      attachment_types,
    })
    .select("id")
    .single();

  if (messageError) {
    return { error: messageError };
  }

  const messageId = message.id;

  if (voice_message && voice_message.url) {
    const { signedUrl, error } = await generatePublicVoiceMessageUrl(voice_message?.url);
    if (error) {
      return { error };
    }

    let peaks;
    try {
      peaks = JSON.parse(voice_message.peaks);
    } catch (e) {
      return { error: { status: 500, statusText: "Cannot parse peaks array" } };
    }

    const { error: voiceDataErr } = await supabase.from("voice_messages").insert({
      message_id: messageId,
      signed_url: signedUrl,
      name: voice_message.name,
      url: voice_message.url,
      duration: voice_message.duration,
      peaks,
    });

    if (voiceDataErr) {
      return { error: { status: 500, statusText: "Cannot create voice message" } };
    }
  }

  const linksData = transformLinks({ messageId, links });
  let attachmentsData = mergeAttachments({ messageId, images, file_attachments });
  let signingError;
  ({ data: attachmentsData, error: signingError } = await addSignedUrls(attachmentsData));

  if (signingError) {
    return { error: signingError };
  }

  const [{ error: linksError }, { error: attachmentsError }] = await Promise.all([
    supabase.from("links").insert(linksData),
    supabase.from("attachments").insert(attachmentsData),
  ]);

  if (linksError) return { error: linksError };
  if (attachmentsError)
    return {
      error: attachmentsError,
    };

  const { data, error } = await getMessage({ messageId });
  return { data, error };
}

export async function updateMessage({ userId, newContent, messageId, newDeltaContent }) {
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select()
    .match({ id: messageId, user_id: userId })
    .maybeSingle();

  if (!message) {
    return { error: { status: 400, statusText: "No message found or violates ownership" } };
  }
  if (messageError) {
    return { error: messageError };
  }

  const deletingLinksError = await deleteLinks({ messageId });
  if (deletingLinksError) {
    return { error: deletingLinksError };
  }

  const { text_content, delta_content } = textConversions({
    textContent: newContent,
    deltaContent: newDeltaContent,
  });

  let links = extractLinks(text_content);
  const linksData = transformLinks({ messageId, links });

  const { data, error } = await supabase
    .from("messages")
    .update({ text_content: text_content, delta_content: delta_content })
    .eq("id", messageId)
    .select();

  if (error) {
    return { error };
  }
  const { error: linksError } = await supabase.from("links").insert(linksData);
  if (linksError) return { error: linksError };

  return { data };
}

export async function deleteMessage({ userId, messageId }) {
  const { data: messageData, error: ownershipError } = await messageOwnership({
    userId,
    messageId,
  });

  if (ownershipError) {
    return { error: ownershipError };
  }

  const { data, error } = await supabase.from("messages").delete().eq("id", messageId).select();
  if (error) {
    return { error };
  }
  // delete attachments
  if (messageData.attachments) {
    const files = messageData.attachments.map((attachment) => attachment.name);
    await deleteStorageFiles({ bucket: "message_attachments", files });
  }
  if (messageData.voice_message_url) {
    await supabase.storage.from("voice_messages").remove([messageData.voice_message_url]);
  }

  return { data };
}

export async function searchMessages({ userId, keyword, type, page = 1, pageSize = 10 }) {
  const { from, to } = getPagination(page, pageSize);

  // keyword = keyword?.split(" ").join("+");
  let searchColumn = "text_content";

  let query = supabase
    .from("messages")
    .select(`*, links(url), attachments(attachment_type, name), voice_messages(name)`, {
      count: "exact",
    })
    .eq("user_id", userId);

  switch (type) {
    case "image":
    case "file":
      query = query.not("attachments", "is", null);
      query = query.contains("attachment_types", [type]);
      searchColumn = "attachments.name";
      break;
    case "link":
      query = query.not("links", "is", null);
      searchColumn = "links.url";
      break;
    case "voice":
      query = query.not("voice_messages", "is", null);
      searchColumn = "voice_messages.name";
      break;
  }

  if (keyword) {
    query.ilike(searchColumn, `%${keyword}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: matchingMessages, count, error: matchingMessagesErr } = await query;
  if (matchingMessagesErr) {
    return { error: matchingMessagesErr };
  }

  const { data, error } = await supabase
    .from("messages")
    .select(`*, links(*), attachments(*), voice_messages(*)`)
    .in(
      "id",
      matchingMessages.map((msg) => msg.id),
    )
    .order("created_at", { ascending: false });

  return {
    data: {
      messages: data,
      pagination: {
        current_page: page,
        page_size: pageSize,
        total_pages: (() => {
          const safeCount = count ?? 0;
          const safePageSize = pageSize > 0 ? pageSize : 1;
          return Math.ceil(safeCount / safePageSize);
        })(),
      },
    },
    error,
  };
}

function extractLinks(text) {
  const linkRegex = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  return text?.match(linkRegex) || [];
}

function transformLinks({ links, messageId }) {
  return links.map((link) => ({
    url: link,
    message_id: messageId,
  }));
}

function mergeAttachments({ messageId, images = [], file_attachments = [] }) {
  const attachments = [
    ...images.map((image) => ({ ...image, attachment_type: "image", message_id: messageId })),
    ...file_attachments.map((file) => ({
      ...file,
      attachment_type: "file",
      message_id: messageId,
    })),
  ];

  return attachments;
}

async function addSignedUrls(
  attachmentsData,
  bucket = "message_attachments",
  time = 60 * 60 * 24 * 30 * 6,
) {
  const attachmentUrls = attachmentsData.map((attachment) => attachment.url);
  if (attachmentUrls.length === 0) return { data: attachmentsData };
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(attachmentUrls, time);

  if (error) {
    return { error: error };
  }

  const updatedAttachments = attachmentsData.map((attachment) => {
    const matchingItem = data.find((item) => item.path === attachment.url);
    if (matchingItem) {
      return { ...attachment, signed_url: matchingItem.signedUrl };
    }
    return attachment;
  });

  return { data: updatedAttachments };
}

async function generatePublicVoiceMessageUrl(
  voiceUrl = "",
  bucket = "voice_messages",
  expiresIn = 60 * 60 * 24 * 30 * 6,
) {
  if (voiceUrl.length <= 0) {
    return { signedUrl: "" };
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(voiceUrl, expiresIn);

  if (error) {
    return { error };
  }
  return { signedUrl: data.signedUrl };
}

async function deleteLinks({ messageId }) {
  const { error } = await supabase.from("links").delete().eq("message_id", messageId);
  return error;
}

async function messageOwnership({ messageId, userId }) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, attachments(*)")
    .match({ id: messageId, user_id: userId })
    .maybeSingle();

  if (!data) {
    return { error: { status: 400, statusText: "No message found or violates ownership" } };
  }
  if (error) {
    return { error };
  }
  return { data };
}

async function deleteStorageFiles({ bucket, files }) {
  const { error } = supabase.storage.from(bucket).remove(files);
  return { error };
}

async function getMessage({ messageId }) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, links(*), attachments(*), voice_messages(*)")
    .eq("id", messageId)
    .maybeSingle();

  return { data, error };
}
