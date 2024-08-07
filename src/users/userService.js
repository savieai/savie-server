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
  return { data, error };
}

export async function updateUser(userId, notifyPro = false, joinWaitlist = false) {
  const { data, error } = await supabase
    .from("users")
    .update({ notify_pro: notifyPro, join_waitlist: joinWaitlist })
    .eq("user_id", userId);

  return { data, error };
}
