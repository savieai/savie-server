import express from "express";
import { deleteUserDB } from "./userService.js";

function getUserRoutes() {
  const router = express.Router();
  router.delete("/:id", deleteUser);
  return router;
}

async function deleteUser(req, res) {
  const userId = req.params.id;
  const { data, error } = deleteUserDB(userId);

  if (error) {
    return res.status(400).json(error);
  }
  return res.json(data);
}

export default getUserRoutes;
