/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-07-22 12:55:16
 * @LastEditors: Kenzi
 */
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export const USER_TYPES = {
  CONSUMER: "consumer",
  SUPPORT: "support",
};

const onlineUserSchema = new mongoose.Schema(
  {
    username: String,
    socket_id: String,
  },
  {
    timestamps: true,
    collection: "online_users",
  }
);

/**
 * @param {String} username
 * @param {String} socket_id
 * @returns {Object} new user object created
 */
onlineUserSchema.statics.onUserOnline = async function (username, socket_id) {
  try {
    const user = await this.findOneAndUpdate(
      { username: username },
      { socket_id: socket_id },
      { upsert: false }
    );

    if (!user) {
      const createUser = await this.create({
        username: username,
        socket_id: socket_id,
      });
    }
    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * @param {String} id user id
 * @return {Object} User profile object
 */
onlineUserSchema.statics.getUserById = async function (id) {
  try {
    const user = await this.findOne({ _id: id });
    if (!user) throw { error: "No user with this id found" };
    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * @return {Array} List of all users
 */
onlineUserSchema.statics.getUsers = async function (username) {
  try {
    const users = await this.findOne({ username: username });
    return users;
  } catch (error) {
    throw error;
  }
};

/**
 * @param {Array} ids, string of user ids
 * @return {Array of Objects} users list
 */
onlineUserSchema.statics.getUserByIds = async function (username) {
  try {
    const users = await this.find({ username: { $in: username } });
    return users;
  } catch (error) {
    throw error;
  }
};

/**
 * @param {String} id - id of user
 * @return {Object} - details of action performed
 */
onlineUserSchema.statics.deleteByUserById = async function (id) {
  try {
    const result = await this.remove({ _id: id });
    return result;
  } catch (error) {
    throw error;
  }
};

export default mongoose.model("OnlineUsers", onlineUserSchema);
