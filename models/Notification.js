/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-18 15:34:26
 * @LastEditTime: 2021-06-24 18:44:28
 * @LastEditors: Kenzi
 */
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export const NOTIFICATION_TYPES = {
  ADD_FRIEND: "add_friend",
};

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4().replace(/\-/g, "") },
    type: { type: String, required: true, enum: ["add_friend"] },
    data: { type: Array, required: true },
    from_user_id: { type: String, required: true },
    to_user_ids: { type: Array, required: true },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

/**
 *
 * @param {NOTIFICATION_TYPES} type 通知類型
 * @param {Array} data
 * @param {String} from_user_id
 * @param {Array} to_user_ids
 * @returns
 */

notificationSchema.statics.postNotifications = async function (
  type,
  data,
  from_user_id,
  to_user_ids
) {
  try {
    const post = await this.create({ type, data, from_user_id, to_user_ids });

    return post;
  } catch (error) {
    throw error;
  }
};

notificationSchema.statics.findNotificationsByType = async function (
  type,
  user_id
) {
  try {
    const notifications = this.aggregate([
      { $match: { to_user_ids: { $all: [user_id] }, type: type } },
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$from_user_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
            {
              $project: {
                public_id: "$public_id",
                name: "$name",
                status: "$status",
                avatar: "$avatar",
              },
            },
          ],

          as: "post_from_user",
        },
      },
      {
        $project: {
          _id: "$id",
          data: "$data",
          type: "$type",
          created_at: "$createdAt",
          updated_at: "$updatedAt",
          post_from_user: "$post_from_user",
        },
      },
    ]);

    console.log("notifications :>> ", notifications);
    return notifications;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

export default mongoose.model("notifications", notificationSchema);