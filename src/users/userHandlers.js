import express from "express";
import { deleteAuthUser, getUser } from "./userService.js";

function getUserRoutes() {
  const router = express.Router();
  router.delete("/:id", deleteUser);
  return router;
}

function getUserRoutesPublic() {
  const router = express.Router();
  router.get("/:id", show);
  return router;
}

async function show(req, res) {
  const { currentUser } = res.locals;
  const { data, error } = await getUser(currentUser.sub);

  if (error) {
    return res.status(400).json(error);
  }
  if (!data) {
    return res.status(400).json({ statusCode: 400, statusText: "User not found" });
  }
  return res.json(data);
}

async function deleteUser(req, res) {
  const userId = req.params.id;
  const { data, error } = deleteAuthUser(userId);

  if (error) {
    return res.status(400).json(error);
  }
  return res.json(data);
}

export { getUserRoutes, getUserRoutesPublic };
