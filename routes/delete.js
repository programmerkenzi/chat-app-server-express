/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:27
 * @LastEditTime: 2021-07-21 11:20:27
 * @LastEditors: Kenzi
 */
import express from "express";
// controllers
import deleteController from "../controllers/delete.js";

const router = express.Router();

router
  .delete("/room/:roomId", deleteController.deleteRoomById)
  .delete("/:room_id/messages", deleteController.deleteMessageById)
  .delete(
    "/notification/:notification_id",
    deleteController.deleteNotificationById
  );

export default router;
