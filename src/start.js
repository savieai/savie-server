import express from "express";
import bodyParser from "body-parser";
import pino from "pino-http";

import { router, publicRouter } from "./routes.js";
import { authenticateUser, authorizeUser } from "./auth.js";

export function startServer() {
  const app = express();
  const logger = pino();

  app.use(logger);
  app.use(bodyParser.json());
  app.use(authenticateUser);
  app.use("/api", publicRouter);
  if (process.env.INVITE_ONLY === "true") {
    app.use(authorizeUser);
  }
  app.use("/api", router);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
