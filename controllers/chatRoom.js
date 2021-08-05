// utils
import makeValidation from "@withvoid/make-validation";
// models
import ChatRoomModel, { CHAT_ROOM_TYPES } from "../models/ChatRoom.js";
import ChatMessageModel from "../models/ChatMessage.js";
import fs from "../controllers/fs.js";

import { emitUsersExceptSender } from "./../utils/utils.js";
import { gfs } from "../config/mongo.js";
import createError from "http-errors";

import { fetchConversationsIncludedPinnedMessages } from "../library/chatRoom.js";
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
        currentLoggedUser,
        chatRoom.room_info._id
      );

      return res.status(200).json({
        success: true,
        data: { room_info: room_info },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  postMessage: async (req, res, next) => {
    try {
      const { room_id } = req.params;
      const { message, file } = req.body;

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );
      const currentLoggedUser = req.user_id;

      if (!user_ids) return next(createError.BadRequest());

      if (!user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const currentLoggedUserSocketId = req.socket_id;

      const post = await ChatMessageModel.createPostInChatRoom(
        room_id,
        message,
        file,
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
      return next(createError.InternalServerError());
    }
  },
  getConversationByRoomId: async (req, res, next) => {
    try {
      const { room_id } = req.params;
      const currentLoggedUser = req.user_id;
      // 分页
      const options = {
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10,
      };

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );
      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const room_info = await ChatRoomModel.getChatRoomByRoomId(
        currentLoggedUser,
        room_id
      );

      if (!room_info) return next(createError.BadRequest());

      let conversations = null;

      //尋找創建時間最早的Pin的訊息
      const firstPinnedMessage =
        await ChatMessageModel.findLastPinMessageByRoomId(room_id);

      //如果是fetch第一頁訊息時確保包含所有pin的訊息
      if (firstPinnedMessage.length > 0 && options.page === 0) {
        const firstPinnedMessageId = firstPinnedMessage[0]._id;
        conversations = await fetchConversationsIncludedPinnedMessages(
          room_id,
          currentLoggedUser,
          firstPinnedMessageId,
          options
        );
      } else {
        conversations = await ChatMessageModel.getConversationByRoomId(
          room_id,
          currentLoggedUser,
          options
        );
      }

      if (conversations)
        return res.status(200).json({
          success: true,
          data: {
            ...conversations,
            firstPinnedMessageId:
              firstPinnedMessage.length > 0 ? firstPinnedMessage[0]._id : null,
          },
        });
    } catch (error) {
      console.log("error :>> ", error);
      return next(createError.InternalServerError());
    }
  },
  markConversationReadByRoomId: async (req, res) => {
    try {
      const { room_id } = req.params;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );

      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const result = await ChatMessageModel.markMessageRead(
        room_id,
        currentLoggedUser
      );
      const { ok, nModified } = await result;

      //如果成功修改
      if (ok && nModified > 0) {
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
      return next(createError.InternalServerError());
    }
  },
  forwardMessages: async (req, res, next) => {
    try {
      const to_room_id = req.params.room_id;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      const { message_ids, file, message } = req.body;

      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          message_ids: {
            type: types.array,
            options: { unique: true, empty: false, stringOnly: true },
          },
        },
      }));
      if (!validation.success)
        return res.status(400).json({ error: validation });
      if (!to_room_id)
        return res.status(400).json({ error: "pls provide room_id" });

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        to_room_id
      );
      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const findMessage = await ChatMessageModel.findMessage(message_ids);

      if (findMessage.length !== message_ids.length)
        return next(createError.BadRequest());

      //建立新讯息
      const createForwardMessages = await ChatMessageModel.forwardMessages(
        file,
        message,
        currentLoggedUser,
        to_room_id,
        message_ids
      );

      //获取新讯息明细
      const newMessage = await ChatMessageModel.findMessage([
        createForwardMessages._id,
      ]);

      //emit 房间用户

      if (user_ids) {
        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "new_message",
          newMessage
        );
      }

      return res.status(200).json({
        success: true,
        data: { success: true, data: newMessage },
      });
    } catch (error) {
      console.log(error);
      return next(createError.InternalServerError());
    }
  },
  replyMessage: async (req, res, next) => {
    try {
      const to_room_id = req.params.room_id;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      const { message_id, file, message } = req.body;

      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          message_id: {
            type: types.string,
          },
        },
      }));
      if (!validation.success)
        return res.status(400).json({ error: validation });
      if (!to_room_id)
        return res.status(400).json({ error: "pls provide room_id" });

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        to_room_id
      );
      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const findMessage = await ChatMessageModel.findMessage([message_id]);
      if (findMessage.length === 0) return next(createError.BadRequest());

      //建立新讯息
      const createReplyMessages = await ChatMessageModel.replyMessage(
        message,
        file,
        currentLoggedUser,
        to_room_id,
        message_id
      );

      //获取新讯息明细
      const newMessage = await ChatMessageModel.findMessage([
        createReplyMessages._id,
      ]);

      //emit 房间用户
      if (user_ids) {
        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "new_message",
          newMessage
        );
      }

      return res.status(200).json({
        success: true,
        data: { success: true, data: newMessage },
      });
    } catch (error) {
      console.log(error);
      return next(createError.InternalServerError());
    }
  },

  pinMessage: async (req, res, next) => {
    try {
      const { room_id, message_id } = req.params;

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );

      const currentLoggedUser = req.user_id;

      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const pinMessage = await ChatMessageModel.pinMessage(room_id, message_id);

      if (pinMessage.success) {
      }

      const { ok, nModified } = await pinMessage;

      const currentLoggedUserSocketId = req.socket_id;

      //如果成功修改
      if (ok && nModified > 0) {
        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "pinned_message",
          {
            chat_room_id: room_id,
            message_id: message_id,
          }
        );
      }
      return res.status(200).json({
        success: true,
        data: { success: true, data: pinMessage },
      });
    } catch (error) {
      console.log(error);
      return next(createError.InternalServerError());
    }
  },
  cancelPinMessage: async (req, res, next) => {
    try {
      const { room_id, message_id } = req.params;

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );

      const currentLoggedUser = req.user_id;

      if (!user_ids || !user_ids.includes(currentLoggedUser))
        return next(createError.BadRequest());

      const unpinMessage = await ChatMessageModel.cancelPinMessage(
        room_id,
        message_id
      );

      const { ok, nModified } = await unpinMessage;

      const currentLoggedUserSocketId = req.socket_id;

      //如果成功修改
      if (ok && nModified > 0) {
        emitUsersExceptSender(
          currentLoggedUserSocketId,
          user_ids,
          "unpinned_message",
          {
            chat_room_id: room_id,
            message_id: message_id,
          }
        );
      }

      return res.status(200).json({
        success: true,
        data: { success: true, data: unpinMessage },
      });
    } catch (error) {
      console.log(error);
      return next(createError.InternalServerError());
    }
  },
};
