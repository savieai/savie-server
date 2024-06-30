import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export async function getMessages(userId, searchTerm) {
  let query = supabase.from("messages").select().eq("user_id", userId);

  if (searchTerm) {
    searchTerm = searchTerm.split(" ").join("+");
    query.textSearch("text", searchTerm);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createMessage(userId, text, attachments) {
  const { error } = await supabase
    .from("messages")
    .insert({ user_id: userId, text: text, attachments: attachments });

  return { error };
}
