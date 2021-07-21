/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-24 15:45:19
 * @LastEditTime: 2021-07-20 17:26:51
 * @LastEditors: Kenzi
 */

import Users from "../models/Users.js";
import Notifications, { NOTIFICATION_TYPES } from "../models/Notification.js";
import makeValidation from "@withvoid/make-validation";
import { emitUsersExceptSender } from "../utils/utils.js";
import createError from "http-errors";

export default {
  postNotification: async (req, res, next) => {
    try {
      const type = req.params.type;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;
      let returnData = null;
      //加好友
      if (type === NOTIFICATION_TYPES.ADD_FRIEND) {
        const postToUserId = req.body.user_id;
        if (!postToUserId) return next(createError(400, "pls provide user_id"));
        const postToUser = await Users.findUserById(postToUserId);
        if (!postToUser.length) return next(createError(400, "wrong user_id"));
        const post_from_user = await Users.findUserById(currentLoggedUser);
        if (!post_from_user) return next(createError(400, "wrong user id"));

        //确认是否之前已经发过交友邀请
        const userPosted = await Notifications.findUserSamePosted(
          type,
          currentLoggedUser,
          postToUserId
        );

        if (userPosted.length > 0)
          return res
            .status(200)
            .json({ success: false, message: "has same post" });

        const notificationInfo = await Notifications.postNotifications(
          type,
          {},
          currentLoggedUser,
          postToUserId
        );

        const { _id, createdAt } = notificationInfo;

        returnData = notificationInfo;

        emitUsersExceptSender(
          currentLoggedUserSocketId,
          [postToUser[0]._id],
          "add_friend_request",
          {
            _id,
            type,
            post_from_user,
            createdAt,
          }
        );
        return res.status(200).json({ success: true, data: notificationInfo });
      }
    } catch (error) {
      console.log("error :>> ", error);
      return next(createError.InternalServerError());
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
  getAllNotifications: async (req, res) => {
    try {
      const type = req.params.type;
      const currentLoggedUser = req.user_id;
      const currentLoggedUserSocketId = req.socket_id;

      const notifications = await Notifications.findNotificationsByUserId(
        currentLoggedUser
      );

      return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      console.log("error :>> ", error);
      return res.status(500).json({ success: false, error: error });
    }
  },
};
