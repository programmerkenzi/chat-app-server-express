/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-24 16:35:01
 * @LastEditTime: 2021-07-21 10:46:31
 * @LastEditors: Kenzi
 */
import notification from "../controllers/notifications.js";
import express from "express";

const router = express.Router();

router
  .post("/:type", notification.postNotification)
  .get("/:type", notification.getNotificationsByType)
  .get("/", notification.getAllNotifications);

export default router;
