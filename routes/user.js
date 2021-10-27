/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-07-19 14:18:20
 * @LastEditors: Kenzi
 */
import express from "express";
// controllers
import user from "../controllers/user.js";

const router = express.Router();

router
  .get("/", user.onGetAllUsers)
  .get("/my_info", user.onGetUserById)
  .post("/create", user.onCreateUser)
  .get("/friends", user.onGetUsersFriends)
  .get(
    "/public-id/:public_id",

    user.onGetUserByPublicId
  )
  .put("/add-friend/:public_id", user.onAddFriend)
  .put("/avatar", user.onUpdateUserAvatar)
  .put("/bg", user.onUpdateUserBackground);

export default router;
