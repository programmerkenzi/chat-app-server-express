/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-07-08 10:57:12
 * @LastEditors: Kenzi
 */
import express from "express";
// controllers
import user from "../controllers/user.js";
import { decode } from "../middlewares/jwt.js";

const router = express.Router();

router
  .get("/", decode, user.onGetAllUsers)
  .get("/my_info", decode, user.onGetUserById)
  .post("/create", user.onCreateUser)
  .get("/friends", decode, user.onGetUsersFriends)
  .get("/public-id/:public_id", decode, user.onGetUserByPublicId)
  .put("/add-friend/:public_id", decode, user.onAddFriend);

export default router;
