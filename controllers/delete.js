/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:22
 * @LastEditTime: 2021-07-02 19:01:39
 * @LastEditors: Kenzi
 */
import ChatRoomModel from "../models/ChatRoom.js";
import ChatMessageModel from "../models/ChatMessage.js";
import { gfs } from "../config/mongo.js";
import makeValidation from "@withvoid/make-validation";
import { emitUsersExceptSender } from "./../utils/utils.js";

export default {
  deleteRoomById: async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await ChatRoomModel.remove({ _id: roomId });
      const messages = await ChatMessageModel.remove({ chatRoomId: roomId });
      return res.status(200).json({
        success: true,
        message: "Operation performed succesfully",
        deletedRoomsCount: room.deletedCount,
        deletedMessagesCount: messages.deletedCount,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },
  deleteMessageById: async (req, res) => {
    try {
      const { message_ids } = req.body;
      const { room_id } = req.params;
      const currentLoginSocketId = req.socket_id;
      const validation = makeValidation((types) => ({
        payload: req.body,
        checks: {
          message_ids: {
            type: types.array,
            options: { unique: true, empty: false, stringOnly: true },
          },
        },
      }));
      if (!validation.success) return res.status(400).json({ ...validation });
      let withFilesIds = [];

      const findMessages = await ChatMessageModel.findMessage(message_ids);

      findMessages.forEach((msg) => {
        console.log("findMessages :>> ", findMessages);
        const files = msg.file;
        console.log("files :>> ", files);
        files.forEach((file) => {
          withFilesIds.push(file._id);
        });
      });

      const findFile = await gfs.deleteMany({ _id: { $in: withFilesIds } });
      const deleteAllMessages = await ChatMessageModel.deleteMany({
        _id: { $in: message_ids },
      });
      console.log("findFile :>> ", findFile);
      // console.log("findMessages :>> ", findMessages);
      // console.log("deleteAllMessages :>> ", deleteAllMessages);
      // const deleteMessages = await message_ids.forEach(
      //   async (message_id, index) => {
      //     const messageInfo = await ChatMessageModel.find();

      //     if (messageInfo[0]) {
      //       const withFiles = messageInfo[0].file;
      //       withFiles.forEach(async (item) => {
      //         const findFile = await gfs.delete(item._id);
      //       });
      //       const message = await ChatMessageModel.deleteOne({
      //         _id: message_id,
      //       });
      //     }
      //   }
      // );

      // const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
      //   room_id
      // );

      // if (user_ids) {
      //   console.log("user_ids :>> ", user_ids);
      //   await emitUsersExceptSender(
      //     currentLoginSocketId,
      //     user_ids,
      //     "delete_message",
      //     {
      //       message_ids: message_ids,
      //     }
      //   );
      // }

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
};
