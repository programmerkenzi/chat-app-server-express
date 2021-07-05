/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-24 16:35:01
 * @LastEditTime: 2021-06-24 16:51:59
 * @LastEditors: Kenzi
 */
import notification from "../controllers/notifications.js";
import express from "express";

const router = express.Router();

router
  .post("/:type", notification.postNotification)
  .get("/:type", notification.getNotificationsByType);

export default router;
