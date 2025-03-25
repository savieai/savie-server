import express from "express";

import { getMessageRoutes } from "./messages/index.js";
import { getUserRoutes, getUserRoutesPublic } from "./users/index.js";
import { getInviteRoutes, getInviteRoutesNonAuthorized } from "./invite_codes/index.js";
import { getAIRoutes } from "./ai/index.js";
import { getServiceRoutes } from "./services/index.js";
import { getTaskRoutes } from "./tasks/index.js";
import { getSearchRoutes } from "./search/index.js";

const router = express.Router();
router.use("/messages", getMessageRoutes());
router.use("/users", getUserRoutes());
router.use("/invite_codes", getInviteRoutes());
router.use("/ai", getAIRoutes());
router.use("/services", getServiceRoutes());
router.use("/tasks", getTaskRoutes());
router.use("/search", getSearchRoutes());

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
