import express from "express";

import { getMessageRoutes } from "./messages/index.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());

export default router;
