import express from "express";
import { deleteAuthUser, getUser, updateUser } from "./userService.js";

function getUserRoutes() {
  const router = express.Router();
  router.delete("/:id", deleteUser);
  return router;
}

function getUserRoutesPublic() {
  const router = express.Router();
  router.get("/:id", show);
  router.patch("/:id", update);
  return router;
}

async function show(req, res) {
  try {
    const { currentUser } = res.locals;
    const { data, error } = await getUser(currentUser.sub);

    if (error) {
      return res.status(400).json(error);
    }
    if (!data) {
      return res.status(400).json({ statusCode: 400, statusText: "User not found" });
    }
    return res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

async function update(req, res) {
  try {
    const { currentUser } = res.locals;
    const notifyPro = req.body.notify_pro;
    const joinWaitlist = req.body.join_waitlist;

    const { error } = updateUser(currentUser.sub, notifyPro, joinWaitlist);
    if (error) {
      return res.status(400).json(error);
    }
    return res.json({ statusCode: 200, statusText: "OK" });
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

async function deleteUser(req, res) {
  try {
    const { currentUser } = res.locals;
    const userId = currentUser.sub;
    const { error } = deleteAuthUser(userId);

    if (error) {
      return res.status(400).json(error);
    }
    return res.json({ data: { status: 204, statusText: "Deleted Successfully" } });
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

export { getUserRoutes, getUserRoutesPublic };
