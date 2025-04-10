import express from "express";
import {
  createMessage,
  deleteMessage,
  getMessages,
  searchMessages,
  updateMessage,
} from "./messageService.js";

function getMessageRoutes() {
  const router = express.Router();
  router.get("/", index);
  router.post("/", create);
  router.patch("/:id", update);
  router.get("/search", search);
  router.delete("/:id", destroy);
  return router;
}

async function index(req, res) {
  try {
    const { currentUser } = res.locals;
    const { page, page_size, message_id } = req.query;

    const { data, error } = await getMessages({
      userId: currentUser.sub,
      page: page ? parseInt(page) : undefined,
      pageSize: page_size ? parseInt(page_size) : undefined,
      message_id,
    });

    if (error) {
      return res.status(400).json(error);
    }

    res.status(200).json({ data });
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

async function create(req, res) {
  try {
    const { text_content, delta_content, file_attachments, images, voice_message, temp_id } =
      req.body;
    const { currentUser } = res.locals;

    const { error, data } = await createMessage({
      userId: currentUser.sub,
      text_content,
      delta_content,
      file_attachments,
      images,
      voice_message,
      temp_id,
    });
    if (error) {
      return res.status(400).json(error);
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ message: "Unexpected error " + e });
  }
}

async function update(req, res) {
  try {
    const { currentUser } = res.locals;
    const newContent = req.body.text_content;
    const newDeltaContent = req.body.delta_content;
    const messageId = req.params.id;

    if (!messageId) {
      return res.status(400).json({ statusText: "messageId is required in params" });
    }

    if (!newContent && !newDeltaContent) {
      return res.status(200).json({ message: "Nothing to update" });
    }

    const { data, error } = await updateMessage({
      newContent,
      userId: currentUser.sub,
      messageId,
      newDeltaContent,
    });
    if (error) {
      return res.status(400).json(error);
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

async function destroy(req, res) {
  try {
    const { currentUser } = res.locals;
    const messageId = req.params.id;

    if (!messageId) {
      return res.status(400).json({ statusText: "messageId is required in params" });
    }

    const { data, error } = await deleteMessage({ userId: currentUser.sub, messageId });
    if (error) {
      return res.status(400).json(error);
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

async function search(req, res) {
  try {
    const keyword = req.query.q;
    const type = req.query.type;
    const { currentUser } = res.locals;
    const { page, page_size } = req.query;

    const { data, error } = await searchMessages({
      userId: currentUser.sub,
      keyword,
      type,
      page: page ? parseInt(page) : undefined,
      pageSize: page_size ? parseInt(page_size) : undefined,
    });

    if (error) {
      return res.status(400).json(error);
    }
    return res.status(200).json({ data });
  } catch (e) {
    res.status(500).json({ message: "Unexpected error" });
  }
}

export default getMessageRoutes;
