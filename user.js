/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-06-24 16:36:13
 * @LastEditors: Kenzi
 */
import express from "express";
// controllers
import user from "../controllers/user.js";
import chatRoom from "../controllers/chatRoom.js";
import notification from "../controllers/notifications.js";

const router = express.Router();

router
  .get("/", user.onGetAllUsers)
  .post("/create", user.onCreateUser)
  .get("/friends", user.onGetUsersFriends)
  .get("/public-id/:public_id", user.onGetUserByPublicId)
  .put("/add-friend/:public_id", user.onAddFriend);

export default router;
