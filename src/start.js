import express from "express";
import bodyParser from "body-parser";
import pino from "pino-http";

import routes from "./routes.js";
import { authenticateUser, authorizeUser } from "./auth.js";

export function startServer() {
  const app = express();
  const logger = pino();

  app.use(logger);
  app.use(bodyParser.json());
  app.use(authenticateUser);
  if (process.env.INVITE_ONLY === "true") {
    app.use(authorizeUser);
  }
  app.use("/api", routes);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
