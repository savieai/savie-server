import express from "express";
import { createMessage, getMessages } from "./messageService.js";

function getMessageRoutes() {
  const router = express.Router();
  router.get("/", index);
  router.post("/", create);
  return router;
}

async function index(req, res) {
  const searchTerm = req.query.search;
  const { data, error } = await getMessages(searchTerm);
  if (error) {
    return res.status(400).json(error);
  }

  res.status(200).json(data);
}

async function create(req, res) {
  const text = req.body.text;
  const attachments = req.body.attachments;

  const { error } = await createMessage(text, attachments);
  if (error) {
    return res.status(400).json(error);
  }

  res.status(200).json({ message: "ok" });
}

export default getMessageRoutes;
