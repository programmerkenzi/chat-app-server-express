/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:22
 * @LastEditTime: 2021-07-06 18:04:14
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
      
      if (!validation.success) return res.status(400).json({ error: validation.error });
      let withFilesIds = [];

      const findMessages = await ChatMessageModel.findMessage(message_ids);

      findMessages.forEach((msg) => {
        const files = msg.file;
        files.forEach((file) => {
          withFilesIds.push(file._id);
        });
      });
      

      if(withFilesIds.length > 0){
     withFilesIds.forEach(  async file => {
        const deleteFile = await gfs.delete(file)
        })
      }
      const deleteAllMessages = await ChatMessageModel.deleteMany({
        _id: { $in: message_ids },
      });
     
      

      const { user_ids } = await ChatRoomModel.getChatRoomUsersByRoomId(
        room_id
      );

      if (user_ids) {
         emitUsersExceptSender(
          currentLoginSocketId,
          user_ids,
          "delete_message",
          {
            chat_room_id: room_id,
            message_ids: message_ids,
          }
        );
      }

      return res.status(200).json({
        success: true,
        ...deleteAllMessages
      });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
};
