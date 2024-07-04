import express from "express";
import { createMessage, getMessages, searchMessages } from "./messageService.js";

function getMessageRoutes() {
  const router = express.Router();
  router.get("/", index);
  router.post("/", create);
  router.get("/search", search);
  return router;
}

async function index(req, res) {
  const { currentUser } = res.locals;

  const { data, error } = await getMessages(currentUser.sub);
  if (error) {
    return res.status(400).json(error);
  }

  res.status(200).json(data);
}

async function create(req, res) {
  const text_content = req.body.text_content;
  const file_attachments = req.body.file_attachments;
  const images = req.body.images;
  const voice_message_url = req.body.voice_message_url;
  const { currentUser } = res.locals;

  const { error } = await createMessage({
    userId: currentUser.sub,
    text_content,
    file_attachments,
    images,
    voice_message_url,
  });
  if (error) {
    return res.status(400).json(error);
  }

  res.status(200).json({ message: "ok" });
}

async function search(req, res) {
  const keyword = req.query.q;
  const type = req.query.type;
  const { currentUser } = res.locals;

  const { data, error } = await searchMessages({ userId: currentUser.sub, keyword, type });
  if (error) {
    return res.status(400).json(error);
  }
  return res.status(200).json(data);
}

export default getMessageRoutes;
