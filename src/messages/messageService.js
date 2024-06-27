import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export async function getMessages(searchTerm) {
  let query = supabase.from("messages").select();

  if (searchTerm) {
    searchTerm = searchTerm.split(" ").join("+");
    query.textSearch("text", searchTerm);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createMessage(text, attachments) {
  const { error } = await supabase
    .from("messages")
    .insert({ text: text, attachments: attachments });

  return { error };
}
