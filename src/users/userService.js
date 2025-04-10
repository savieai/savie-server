import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminAuthClient = supabase.auth.admin;

export async function deleteAuthUser({ userId, email }) {
  const reviewAccounts = process.env.REVIEWER_ACCOUNTS?.split(",")?.map((item) => item.trim());

  if (reviewAccounts.includes(email)) {
    const { error: msgError } = await supabase.from("messages").delete().eq("user_id", userId);
    const { error: inviteError } = await supabase
      .from("invite_codes")
      .delete()
      .eq("inviter_id", userId);

    return { error: msgError || inviteError };
  }

  const { error } = await adminAuthClient.deleteUser(userId);
  return { error };
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
