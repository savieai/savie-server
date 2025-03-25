import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export async function getInvites(userId) {
  const { data, error } = await supabase.from("invite_codes").select().eq("inviter_id", userId);
  return { data, error };
}

/**
 * Creates an invite in the database.
 * @async
 * @function createInvite
 * @param {string} inviterId - The ID of the user creating the invite.
 * @returns {Promise<{data: Object|null, error: Error|null}>} Object containing the created invite data or an error.
 */
export async function createInvite(inviterId) {
  const { data: existingInvites, error: inviteFetchErr } = await getInvites(inviterId);
  if (inviteFetchErr) {
    return { error: inviteFetchErr };
  }

  if (existingInvites.length >= parseInt(process.env.MAX_INVITES_ALLOWED)) {
    return { error: { status: 400, statusText: "Invite limit exceeded" } };
  }

  const code = await generateUniqueInviteCode();
  const { data, error } = await supabase
    .from("invite_codes")
    .upsert({ inviter_id: inviterId, code: code })
    .select()
    .maybeSingle();

  return { data, error };
}

/**
 * Update an invite in the database by updating invitee_id and is_used
 * @async
 * @function updateInvite
 * @param {string} inviteeId - The ID of the user accepting the invite.
 * @param {string} code - The invite code.
 * @returns {Promise<{data: Object|null, error: Error|null}>} Object containing the success or error message.
 */
export async function updateInvite(inviteeId, code) {
  const { error: inviteCodeError } = await validateInviteCode(inviteeId, code);
  if (inviteCodeError) {
    return { error: inviteCodeError };
  }

  const { error } = await supabase
    .from("invite_codes")
    .update({ invitee_id: inviteeId, is_used: true })
    .eq("code", code);

  return { data: { status: 200, statusText: "Invite successfully applied" }, error };
}

/**
 * Generates a unique invite code using nanoid + checking supabase for collisions
 * @async
 * @function generateUniqueInviteCode
 * @returns {Promise<string>} A unique 6-character invite code.
 */
export async function generateUniqueInviteCode() {
  while (true) {
    const code = nanoid(6);
    const { data: existingCode, error } = await supabase
      .from("invite_codes")
      .select()
      .eq("code", code)
      .maybeSingle();

    if (!existingCode) {
      return code;
    }
  }
}

/**
 * Validates an invite code for a given invitee.
 *
 * @async
 * @function validateInviteCode
 * @param {string} inviteeId - The ID of the user attempting to use the invite code.
 * @param {string} code - The invite code to validate.
 * @returns {Promise<Error|null>} An object containing an error.
 */
export async function validateInviteCode(inviteeId, code) {
  const { data: inviteCode, error } = await supabase
    .from("invite_codes")
    .select()
    .eq("code", code)
    .maybeSingle();

  const errorResponses = {
    invalidCode: { status: 400, statusText: "Invalid Code" },
    alreadyUsed: { status: 400, statusText: "Invite code already used" },
    selfInvite: { status: 400, statusText: "Cannot use own invite code" },
  };

  if (!inviteCode) return { error: errorResponses.invalidCode };
  if (inviteCode.is_used) return { error: errorResponses.alreadyUsed };
  if (inviteCode.inviter_id === inviteeId) return { error: errorResponses.selfInvite };

  return { error };
}
