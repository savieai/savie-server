import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export async function getMessages(userId) {
  const { data, error } = await supabase
    .from("messages")
    .select(`*, links(url), attachments(attachment_type, name, signed_url)`)
    .eq("user_id", userId);

  return { data, error };
}

export async function createMessage({
  userId,
  text_content,
  file_attachments,
  images,
  voice_message_url,
}) {
  let links = extractLinks(text_content);
  const { signedUrl, error } = await generatePublicVoiceMessageUrl(voice_message_url);
  if (error) {
    return { error };
  }

  const { data, error: messageError } = await supabase
    .from("messages")
    .upsert({
      user_id: userId,
      text_content: text_content,
      voice_message_url: voice_message_url,
      voice_message_url_signed: signedUrl,
    })
    .select("id")
    .single();

  if (messageError) {
    return { error: messageError };
  }

  const messageId = data.id;
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

  return { messageId };
}

export async function updateMessage({ userId, newContent, messageId }) {
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

  let links = extractLinks(newContent);
  const linksData = transformLinks({ messageId, links });

  const { data, error } = await supabase
    .from("messages")
    .update({ text_content: newContent })
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

export async function searchMessages({ userId, keyword, type }) {
  keyword = keyword?.split(" ").join("+");

  let searchColumn = "text_content";
  let query;

  switch (type) {
    case "image":
    case "file":
      query = supabase
        .from("attachments")
        .select("id, message_id, name, created_at, attachment_type, messages!inner(user_id)")
        .match({ "messages.user_id": userId, attachment_type: type });

      searchColumn = "name";
      break;
    case "link":
      query = supabase
        .from("links")
        .select("id, url, message_id, created_at, messages!inner(user_id)")
        .eq("messages.user_id", userId);

      searchColumn = "url";
      break;
    default:
      query = supabase.from("messages").select().eq("user_id", userId);
  }

  if (keyword) {
    query.ilike(searchColumn, `%${keyword}%`);
  }

  const { data, error } = await query;
  return { data, error };
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
