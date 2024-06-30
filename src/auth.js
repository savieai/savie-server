import { jwtDecode } from "jwt-decode";

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
