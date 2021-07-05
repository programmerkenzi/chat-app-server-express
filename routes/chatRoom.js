/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:27
 * @LastEditTime: 2021-06-18 18:12:44
 * @LastEditors: Kenzi
 */
import express from "express";
// controllers
import chatRoom from "../controllers/chatRoom.js";

const router = express.Router();

router
  .get("/", chatRoom.getRecentConversation)
  .get("/:room_id/messages", chatRoom.getConversationByRoomId)
  .post("/initiate", chatRoom.initiate)
  .post("/:room_id/message", chatRoom.postMessage)
  .put("/:room_id/mark-read", chatRoom.markConversationReadByRoomId);

export default router;
