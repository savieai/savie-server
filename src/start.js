import express from "express";
import bodyParser from "body-parser";
import pino from "pino-http";

import routes from "./routes.js";
import { authenticateUser } from "./auth.js";

export function startServer() {
  const app = express();
  const logger = pino();

  app.use(logger);
  app.use(bodyParser.json());
  app.use(authenticateUser);
  app.use("/api", routes);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
