import express from "express";

import { getMessageRoutes } from "./messages/index.js";
import { getUserRoutes } from "./users/index.js";
import { getInviteRoutes, getInviteRoutesNonAuthorized } from "./invite_codes/index.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());
router.use("/users", getUserRoutes());
router.use("/invite_codes", getInviteRoutes());

/**
 * These routes are still guarded by bearer token
 * Following routes can access the app without invite code
 * 1. PUT /invite_codes/:id -> apply invite code
 */
const publicRouter = express.Router();
publicRouter.use("/invite_codes", getInviteRoutesNonAuthorized());

export { router, publicRouter };
