import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminAuthClient = supabase.auth.admin;

export async function deleteAuthUser(userId) {
  const { data, error } = await adminAuthClient.deleteUser(userId);
  return { data, error };
}

export async function getUser(userId) {
  const { data, error } = await supabase.from("users").select().eq("user_id", userId).maybeSingle();
  console.log({
    data: data,
    error: error,
  });
  return { data, error };
}
