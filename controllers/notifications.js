/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-24 15:45:19
 * @LastEditTime: 2021-06-24 18:42:22
 * @LastEditors: Kenzi
 */

import Users from "../models/Users.js";
import Notifications, { NOTIFICATION_TYPES } from "../models/Notification.js";
import makeValidation from "@withvoid/make-validation";
import { emitUsersExceptSender } from "../utils/utils.js";

export default {
  postNotification: async (req, res) => {
    try {
      const type = req.params.type;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      let returnData = null;
      //加好友
      if (type === NOTIFICATION_TYPES.ADD_FRIEND) {
        const postToUserPublicId = req.body.public_id;
        const message = req.body.message;
        const postToUser = await Users.findUsersByPublicId(postToUserPublicId);
        const postByUser = await Users.findUserById(currentLoggedUser);

        const notificationInfo = await Notifications.postNotifications(
          type,
          { message: message },
          currentLoggedUser,
          postToUser[0]._id
        );

        const { _id, createdAt } = notificationInfo;

        returnData = notificationInfo;

        emitUsersExceptSender(
          currentLoggedUserSocketId,
          [postToUser[0]._id],
          "add_friend",
          {
            _id,
            type,
            postByUser,
            message,
            createdAt,
          }
        );
      }
      return res.status(200).json({ success: true, data: returnData });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },

  getNotificationsByType: async (req, res) => {
    try {
      const type = req.params.type;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;

      const notifications = await Notifications.findNotificationsByType(
        type,
        currentLoggedUser
      );

      return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
};
