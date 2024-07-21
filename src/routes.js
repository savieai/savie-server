import express from "express";

import { getMessageRoutes } from "./messages/index.js";
import { getUserRoutes } from "./users/index.js";
import { getInviteRoutes } from "./invite_codes/index.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());
router.use("/users", getUserRoutes());
router.use("/invite_codes", getInviteRoutes());

export default router;
