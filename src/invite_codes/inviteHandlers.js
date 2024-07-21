import express from "express";
import { createInvite, updateInvite, getInvites } from "./inviteService.js";

function getInviteRoutes() {
  const router = express.Router();
  router.get("/", index);
  router.post("/", create);
  router.put("/:id", update);
  return router;
}

async function index(req, res) {
  const { currentUser } = res.locals;
  const { data, error } = await getInvites(currentUser.sub);
  if (error) {
    return res.status(400).json(error);
  }
  return res.json(data);
}

async function create(req, res) {
  const { currentUser } = res.locals;
  const { data, error } = await createInvite(currentUser.sub);
  if (error) {
    return res.status(400).json(error);
  }
  return res.json(data);
}

async function update(req, res) {
  const { currentUser } = res.locals;
  const code = req.params.id;

  const { data, error } = await updateInvite(currentUser.sub, code);

  if (error) {
    return res.status(400).json(error);
  }
  return res.json(data);
}

export default getInviteRoutes;
