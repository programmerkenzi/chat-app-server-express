/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-06-23 14:14:59
 * @LastEditors: Kenzi
 */
// utils
import makeValidation from "@withvoid/make-validation";
// models
import OnlineUsers, { USER_TYPES } from "../models/OnlineUsers.js";
import Users from "../models/Users.js";
import ChatRoom from "../models/ChatRoom.js";

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
      const user = await Users.findUserById(req.params.user_id);
      return user;
    } catch (error) {
      throw error;
    }
  },
  onCreateUser: async (req, res) => {
    try {
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          username: { type: types.string },
          name: { type: types.string },
        },
      }));
      if (!validation.success) return res.status(400).json({ ...validation });
      const { username, avatar, name } = req.body;
      const user = await Users.createNewUser(username, avatar, name);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
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
      return res.status(500).json({ success: false, error: error });
    }
  },

  onAddFriend: async (req, res) => {
    try {
      const currentLoggedUser = req.user_id;
      const addUserPublicId = req.params.public_id;
      const addUser = await Users.findUsersByPublicId(addUserPublicId);

      const addFriends = await Users.addNewFriend(
        currentLoggedUser,
        addUser[0]._id
      );
      return res.status(200).json({
        success: true,
        data: addFriends,
      });
    } catch (error) {
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
      const avatar =
        "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/3.jpg";

      if (!validation.success) return res.status(400).json({ ...validation });

      const user = await Users.createNewUser(username, password, avatar, name);
    } catch (error) {}
  },
};
