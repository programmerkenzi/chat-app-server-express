/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-14 16:26:35
 * @LastEditTime: 2021-07-13 09:52:11
 * @LastEditors: Kenzi
 */

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import uniqueValidator from "mongoose-unique-validator";
const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4().replace(/\-/g, "") },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: { type: String, default: "" },
    name: { type: String, required: true },
    status: { type: String, default: "" },
    friends: { type: Array, default: [] },
    public_id: { type: String, unique: true }, //用于被陌生用户搜索加好友
  },
  {
    timestamps: true,
    collection: "users",
  }
);
userSchema.plugin(uniqueValidator);

/**
 * @param {String} id - id of user
 * @return {Object}  array of all chatroom that the user belongs to
 */
userSchema.statics.createNewUser = async function (username, password, name) {
  try {
    const user = await this.create({
      username: username,
      password: password,
      name: name,
      public_id: username,
    });
    return user;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

//获取用户讯息

/**
 * @param {String} id, user id
 * @return {Object} User profile object
 */
userSchema.statics.findUserById = async function (id) {
  try {
    const user = await this.aggregate([
      { $match: { _id: id } },
      {
        $project: {
          _id: "$_id",
          username: "$username",
          name: "$name",
          status: "$status",
          avatar: "$avatar",
        },
      },
    ]);
    return user;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

//登入用
userSchema.statics.findUserByUsername = async function (username) {
  try {
    const user = await this.findOne({ username: username });
    return user;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

userSchema.statics.findUsersFriends = async function (user_id) {
  console.log("user_id :>> ", user_id);
  try {
    const friends_info = await this.aggregate([
      { $match: { _id: user_id } },
      {
        $lookup: {
          from: "users",
          let: { user_ids: "$friends" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$user_ids"] } } },
            {
              $project: {
                _id: "$_id",
                username: "$username",
                name: "$name",
                status: "$status",
                avatar: "$avatar",
              },
            },
          ],

          as: "friends_info",
        },
      },
      {
        $project: {
          friends_info: "$friends_info",
        },
      },
    ]);

    return friends_info;
  } catch (error) {
    throw error;
  }
};

/**
 *
 * @param {String} current_user_id 目前的user id
 * @param {String} add_user_id  要加的朋友的user id
 * @returns
 */
userSchema.statics.addNewFriend = async function (
  current_user_id,
  add_user_id
) {
  try {
    const update = await this.updateMany(
      {
        _id: current_user_id,
      },
      {
        $addToSet: {
          friends: add_user_id,
        },
      },
      {
        multi: true,
      }
    );

    return update;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

/**
 *
 * @param {String} user_public_id
 */

userSchema.statics.findUsersByPublicId = async function (user_public_id) {
  try {
    const user = await this.aggregate([
      { $match: { public_id: user_public_id } },
      {
        $project: {
          _id: "$_id",
          username: "$username",
          name: "$name",
          status: "$status",
          avatar: "$avatar",
        },
      },
    ]);
    return user;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

export default mongoose.model("Users", userSchema);
