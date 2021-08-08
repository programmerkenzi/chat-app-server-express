/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-08-07 08:58:32
 * @LastEditors: Kenzi
 */
// utils
import makeValidation from "@withvoid/make-validation";
// models
import OnlineUsers, { USER_TYPES } from "../models/OnlineUsers.js";
import Users from "../models/Users.js";
import ChatRoom from "../models/ChatRoom.js";
import bcrypt from "bcrypt";
import { online_users } from "./../utils/WebSockets.js";
import Notifications, { NOTIFICATION_TYPES } from "../models/Notification.js";
import createError from "http-errors";
import { emitUsersExceptSender } from "../utils/utils.js";
import client from "../config/redis.js";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

export default {
  onGetAllUsers: async (req, res) => {
    try {
      const users = await OnlineUsers.getUsers();
      return res.status(200).json({ success: true, users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  onGetUserById: async (req, res, next) => {
    try {
      const user = await Users.findUserById(req.user_id);
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetUserByUsername: async (username) => {
    try {
      const user = await Users.findUserByUsername(username);
      return user;
    } catch (error) {
      throw error;
    }
  },

  onDeleteUserById: async (req, res) => {
    try {
      const res = await OnlineUsers.deleteByUserById(req.params.id);
      return res.status(200).json({
        success: true,
        message: `Deleted a count of ${user.deletedCount} user.`,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetUsersFriends: async (req, res) => {
    try {
      const currentLoggedUser = req.user_id;
      const friends = await Users.findUsersFriends(currentLoggedUser);
      return res.status(200).json({
        success: true,
        data: friends[0].friends_info,
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },

  onAddFriend: async (req, res) => {
    try {
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      const notificationsId = req.body.notification_id;
      const addUserPublicId = req.params.public_id;

      const addUser = await Users.findUsersByPublicId(addUserPublicId);

      if (!addUser.length) return res(createError(400, "wrong public_id"));
      const addFriends = await Users.addNewFriend(
        currentLoggedUser,
        addUser[0]._id
      );

      //删除交友推拨
      if (!notificationsId)
        return res(createError(400, "pls provide notification_id"));
      const deletedNotifications = await Notifications.deleteNotificationById(
        notificationsId
      );

      //emit给目前用户的其他装置
      emitUsersExceptSender(
        currentLoggedUserSocketId,
        [currentLoggedUser],
        "add_friend",
        addUser[0]
      );

      //emit给发送交友邀请的用户

      const currentLoggedUserInfo = await Users.findUserById(currentLoggedUser);

      emitUsersExceptSender(
        currentLoggedUserSocketId,
        [addUser[0]._id],
        "add_friend",
        currentLoggedUserInfo[0]
      );

      return res.status(200).json({
        success: true,
        data: { ...addFriends, ...deletedNotifications, user_info: addUser[0] },
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetRoomByUserId: async (req, res) => {
    try {
      //分页
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10,
      };
      const chatRooms = await ChatRoom.getChatRoomsByUserId(
        req.params.id,
        options
      );
      return res.status(200).json({
        success: true,
        data: chatRooms[0],
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  onGetUserByPublicId: async (req, res) => {
    try {
      const user = await Users.findUsersByPublicId(req.params.public_id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  onCreateUser: async (req, res) => {
    try {
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          username: { type: types.string, required: true },
          name: { type: types.string, required: true },
          password: { type: types.string, required: true },
        },
      }));
      const { username, password, name } = req.body;

      //Hash password
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      //generate keypair  for  private chat

      const keypair = nacl.box.keyPair();
      const { publicKey, secretKey } = keypair;

      //encode keys
      const encodedPublicKey = naclUtil.encodeBase64(publicKey);
      const encodedPrivateKey = naclUtil.encodeBase64(secretKey);

      if (!validation.success) return res.status(400).json({ ...validation });

      ////generate keypair  for  group chat

      const keypairForGroup = nacl.sign.keyPair();
      const publicKeyForGroup = keypairForGroup.publicKey;
      const privateKeyForGroup = keypairForGroup.secretKey;
      const encodedPublicKeyForGroup = naclUtil.encodeBase64(publicKeyForGroup);
      const encodedPrivateKeyForGroup =
        naclUtil.encodeBase64(privateKeyForGroup);

      const user = await Users.createNewUser(
        username,
        hashPassword,
        name,
        encodedPublicKey,
        encodedPublicKeyForGroup
      );

      //store private key  for private chat to redis
      const redisKey = naclUtil.encodeBase64(`${username}${user._id}`);
      const saveToRedis = await client.SET(redisKey, encodedPrivateKey);

      //store private key  for group chat to redis

      const redisKeyForGroup = naclUtil.encodeBase64(
        `${username}${user._id}Group`
      );

      const saveToRedisGroup = await client.SET(
        redisKeyForGroup,
        encodedPrivateKeyForGroup
      );

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
  onLogout: async (req, res) => {
    try {
      const currentLoggedUserSocketId = req.socket_id;
      const theUser = online_users.findIndex(
        (user) => user.socket_id === currentLoggedUserSocketId
      );
      if (theUser !== -1) {
        online_users.splice(theUser, 1);
      }
      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
};
