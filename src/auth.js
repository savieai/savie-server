import { jwtDecode } from "jwt-decode";
import { createClient } from "@supabase/supabase-js";

export function authenticateUser(req, res, next) {
  const errorMessage = { description: "Authorization information is missing or invalid." };

  const authToken = req.get("Authorization");
  try {
    const currentUser = jwtDecode(authToken?.split(" ")[1]);
    res.locals.currentUser = currentUser;
    next();
  } catch (e) {
    return res.status(401).json(errorMessage);
  }
}

export async function authorizeUser(req, res, next) {
  const errorMessage = { status: 400, statusText: "Cannot access the app without invite code" };
  const { currentUser } = res.locals;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("user_id", currentUser.sub)
    .maybeSingle();

  if (!data?.access_allowed) {
    return res.status(401).json(errorMessage);
  }
  next();
}
