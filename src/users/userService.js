import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_URL, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminAuthClient = supabase.auth.admin;

export async function deleteUserDB(userId) {
  const { data, error } = await adminAuthClient.deleteUser(userId);
  return { data, error };
}
