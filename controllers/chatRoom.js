// utils
import makeValidation from "@withvoid/make-validation";
// models
import ChatRoomModel, { CHAT_ROOM_TYPES } from "../models/ChatRoom.js";
import ChatMessageModel from "../models/ChatMessage.js";
import fs from "../controllers/fs.js";

import { emitUsersExceptSender } from "./../utils/utils.js";
import { gfs } from "../config/mongo.js";
export default {
  initiate: async (req, res) => {
    try {
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          user_ids: {
            type: types.array,
            options: { unique: true, empty: false, stringOnly: true },
          },
          type: { type: types.enum, options: { enum: CHAT_ROOM_TYPES } },
        },
      }));
      if (!validation.success) return res.status(400).json({ ...validation });

      const currentLoggedUser = req.user_id;
      const { user_ids, type } = req.body;
      const chatRoom = await ChatRoomModel.initiateChat(
        user_ids,
        type,
        currentLoggedUser
      );
      const room_info = await ChatRoomModel.getChatRoomByRoomId(
        chatRoom.chat_room_id
      );

      return res.status(200).json({
        success: true,
        data: { ...chatRoom, room_info: room_info },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  postMessage: async (req, res) => {
    try {
      const { room_id } = req.params;
      const { message, file, filename } = req.body;

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      console.log("currentLoggedUserSocketId :>> ", currentLoggedUserSocketId);

      const post = await ChatMessageModel.createPostInChatRoom(
        room_id,
        message,
        file,
        filename,
        currentLoggedUser
      );

      if (post) {
        //emit all users except in room currentLoggedUser
        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "new_message",
          post
        );
      }
      return res.status(200).json({ success: true, data: post });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
  getRecentConversation: async (req, res) => {
    try {
      const currentLoggedUser = req.user_id;
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10,
      };
      const rooms = await ChatRoomModel.getChatRoomsByUserId(
        currentLoggedUser,
        options
      );

      return res.status(200).json({ success: true, data: rooms[0] });
    } catch (error) {
      console.log("error :>> ", error);

      return res.status(500).json({ success: false, error: error });
    }
  },
  getConversationByRoomId: async (req, res) => {
    try {
      const { room_id } = req.params;
      //分页
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10,
      };
      const conversations = await ChatMessageModel.getConversationByRoomId(
        room_id,
        options
      );

      return res.status(200).json({
        success: true,
        data: conversations[0],
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
  markConversationReadByRoomId: async (req, res) => {
    try {
      const { room_id } = req.params;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      const result = await ChatMessageModel.markMessageRead(
        room_id,
        currentLoggedUser
      );
      const { ok, nModified } = await result;

      //如果成功修改
      if (ok && nModified > 0) {
        const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
          room_id
        );

        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "mark_read",
          {
            room_id: room_id,
            read_by_user: currentLoggedUser,
          }
        );
      }
      return res.status(200).json({
        success: true,
        data: { success: true, data: result },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },
};
