import express from "express";

import { getMessageRoutes } from "./messages/index.js";
import { getUserRoutes } from "./users/index.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());
router.use("/users", getUserRoutes());

export default router;
