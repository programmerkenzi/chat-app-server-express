/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-06-29 18:11:38
 * @LastEditors: Kenzi
 */
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import mongoosePaginate from "mongoose-paginate-v2";

export const CHAT_ROOM_TYPES = {
  GROUP: "group",
  PRIVATE: "private",
};

const chatRoomSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4().replace(/\-/g, "") },
    name: { type: String, default: "" },
    creator: String,
    avatar: { type: String, default: "" },
    type: String,
    description: { type: String, default: "" },
    user_ids: Array,
  },
  {
    timestamps: true,
    collection: "chat_rooms",
  }
);

/**
 * @param {String} user_id - id of user
 * @return {Array} 获取包含该用户的所有房间,
 */
chatRoomSchema.statics.getChatRoomsByUserId = async function (
  user_id,
  options
) {
  try {
    const rooms_info = await this.aggregate([
      { $match: { user_ids: { $all: [user_id] } } },
      {
        $lookup: {
          from: "users",
          let: { user_ids: "$user_ids" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$user_ids"] } } },
            {
              $project: {
                id: "$_id",
                username: "$username",
                name: "$name",
                status: "$status",
                avatar: "$avatar",
              },
            },
          ],

          as: "user_info",
        },
      },
      {
        $lookup: {
          from: "chat_messages",
          let: { room_id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$chat_room_id", "$$room_id"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],

          as: "last_message",
        },
      },

      {
        $lookup: {
          from: "chat_messages",
          let: { room_id: "$_id", user_id: user_id },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chat_room_id", "$$room_id"] },
                    {
                      $not: {
                        $in: [
                          "$$user_id",
                          "$read_by_recipients.read_by_user_id",
                        ],
                      },
                    },
                  ],
                },
              },
            },
          ],
          as: "unread",
        },
      },

      {
        $facet: {
          total: [
            {
              $count: "createdAt",
            },
          ],
          data: [
            {
              $project: {
                id: "$_id",
                creator: "$creator",
                createdAt: "$createdAt",
                name: "$name",
                avatar: "$avatar",
                type: "$type",
                description: "$description",
                users: "$user_info",
                last_message: "$last_message",
                unread: "$unread",
              },
            },
          ],
        },
      },
      {
        $unwind: "$total",
      },

      {
        $project: {
          data: {
            $slice: [
              "$data",
              options.page * options.limit,
              {
                $ifNull: [options.limit, "$total.createdAt"],
              },
            ],
          },
          meta: {
            total: "$total.createdAt",
            limit: {
              $literal: options.limit,
            },
            page: {
              $literal: (options.page * options.limit) / options.limit + 1,
            },
            pages: {
              $ceil: {
                $divide: ["$total.createdAt", options.limit],
              },
            },
          },
        },
      },
    ]);

    return rooms_info;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

/**
 * @param {String} room_id - id of chatroom
 * @return {Object} chatroom
 */
chatRoomSchema.statics.getChatRoomByRoomId = async function (room_id) {
  try {
    // const room = await this.findOne({ _id: room_id });
    const room_info = await this.aggregate([
      { $match: { _id: room_id } },
      {
        $lookup: {
          from: "users",
          let: { user_ids: "$user_ids" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$user_ids"] } } },
            {
              $project: {
                id: "$_id",
                username: "$username",
                name: "$name",
                status: "$status",
                avatar: "$avatar",
              },
            },
          ],

          as: "user_info",
        },
      },
      {
        $project: {
          id: "$_id",
          creator: "$creator",
          createdAt: "$createdAt",
          avatar: "$avatar",
          name: "$name",
          type: "$type",
          description: "$description",
          users: "$user_info",
        },
      },
    ]);

    return room_info;
  } catch (error) {
    throw error;
  }
};

chatRoomSchema.statics.getChatRoomUsersByRoomId = async function (room_id) {
  try {
    const room = await this.aggregate([
      { $match: { _id: room_id } },
      { $project: { user_ids: "$user_ids" } },
    ]);
    return room[0];
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

//聊天室初始化
/**
 * @param {Array} userIds - array of strings of userIds
 * @param {String} creator - user who initiated the chat
 * @param {CHAT_ROOM_TYPES} type
 */
chatRoomSchema.statics.initiateChat = async function (user_ids, type, creator) {
  try {
    const availableRoom = await this.findOne({
      user_ids: {
        $size: user_ids.length,
        $all: [...user_ids],
      },
      type,
    });
    if (availableRoom) {
      return {
        is_new: false,
        chat_room_id: availableRoom._doc._id,
        type: availableRoom._doc.type,
      };
    }

    const newRoom = await this.create({ user_ids, type, creator });
    return {
      is_new: true,
      chat_room_id: newRoom._doc._id,
      type: newRoom._doc.type,
    };
  } catch (error) {
    console.log("error on start chat method", error);
    throw error;
  }
};

export default mongoose.model("ChatRooms", chatRoomSchema);