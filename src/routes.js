import express from "express";

import { getMessageRoutes } from "./messages/index.js";
import { getUserRoutes, getUserRoutesPublic } from "./users/index.js";
import { getInviteRoutes, getInviteRoutesNonAuthorized } from "./invite_codes/index.js";
import aiRoutes from "./ai/aiRoutes.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());
router.use("/users", getUserRoutes());
router.use("/invite_codes", getInviteRoutes());
router.use("/ai", aiRoutes);

/**
 * These routes are still guarded by bearer token
 * Following routes can access the app without invite code
 * * PUT /invite_codes/:id -> apply invite code
 * * GET /users/:id -> user profile without activating app (specifically access_allowed)
 */
const publicRouter = express.Router();
publicRouter.use("/invite_codes", getInviteRoutesNonAuthorized());
publicRouter.use("/users", getUserRoutesPublic());

export { router, publicRouter };
