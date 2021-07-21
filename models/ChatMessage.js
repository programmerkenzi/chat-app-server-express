import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const read_by_recipientSchema = new mongoose.Schema(
  {
    _id: false,
    read_by_user_id: String,
    read_at: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: false,
    collection: "chat_messages",
  }
);

const delete_by_userSchema = new mongoose.Schema(
  {
    _id: false,
    delete_by_user_id: String,
    delete_at: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: false,
    collection: "chat_messages",
  }
);

const chatMessageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    chat_room_id: { type: String, required: true },
    message: String,
    file: { type: Array, default: [] },
    post_by_user: { type: String, required: true },
    read_by_recipients: [read_by_recipientSchema],
    delete_by_users: [delete_by_userSchema],
  },
  {
    timestamps: true,
    collection: "chat_messages",
  }
);

/**
 * 再聊天室里发送讯息
 *
 * @param {String} room_Id - 房间id
 * @param {Object} message - 讯息
 * @param {String} user_id - 发送讯息的用户id
 * @param {MESSAGE_TYPES} type - message content type
 */
chatMessageSchema.statics.createPostInChatRoom = async function (
  room_id,
  message,
  file,
  filename,
  user_id
) {
  try {
    const post = await this.create({
      chat_room_id: room_id,
      message: message,
      file: file ? file : [],
      filename: filename,
      post_by_user: user_id,
      read_by_recipients: { read_by_user_id: user_id },
    });

    const messageId = post._id;

    const messageInfo = await this.aggregate([
      { $match: { _id: messageId } },
      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                username: "$username",
                name: "$name",
                status: "$status",
                avatar: "$avatar",
              },
            },
          ],

          as: "user",
        },
      },

      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$file" },
          pipeline: [
            { $match: { $expr: { $in: ["$filename", "$$file"] } } },
            {
              $project: {
                filename: "$filename",
                mime_type: "$contentType",
                name: "$metadata.name",
              },
            },
          ],
          as: "file",
        },
      },
      {
        $project: {
          chat_room_id: "$chat_room_id",
          message: "$message",
          file: "$file",
          read_by_recipients: "$read_by_recipients",
          createdAt: "$createdAt",
          user: "$user",
          filename: "$filename",
        },
      },
    ]);
    return messageInfo;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

/**
 * @param {String} chat_room_id - chat room id
 */
chatMessageSchema.statics.getConversationByRoomId = async function (
  chat_room_id,
  current_user_id,
  options = {}
) {
  try {
    const conversation = this.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [chat_room_id, "$chat_room_id"] },
              //过滤已删除讯息
              {
                $not: {
                  $in: [current_user_id, "$delete_by_users.delete_by_user_id"],
                },
              },
              {
                $not: {
                  $in: ["$post_by_user", "$delete_by_users.delete_by_user_id"],
                },
              },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                username: "$username",
                name: "$name",
                avatar: "$avatar",
              },
            },
          ],

          as: "user",
        },
      },
      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$file" },
          pipeline: [
            { $match: { $expr: { $in: ["$filename", "$$file"] } } },
            {
              $project: {
                filename: "$filename",
                mime_type: "$contentType",
                name: "$metadata.name",
              },
            },
          ],
          as: "file",
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
                _id: "$_id",
                chat_room_id: "$chat_room_id",
                message: "$message",
                file: "$file",
                filename: "$filename",
                read_by_recipients: "$read_by_recipients",
                delete_by_users: "$delete_by_users",
                createdAt: "$createdAt",
                user: "$user",
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
            //分页
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

    return conversation;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

chatMessageSchema.statics.getRecentConversation = async function (
  chatRoom_ids,
  options,
  currentUserOnlineId
) {
  try {
    return this.aggregate([
      { $match: { chat_room_id: { $in: chatRoom_ids } } },
      {
        $group: {
          _id: "$chat_room_id",
          messageId: { $last: "$_id" },
          chat_room_id: { $last: "$chat_room_id" },
          message: { $last: "$message" },
          type: { $last: "$type" },
          posted_by_user: { $last: "$post_by_user" },
          created_at: { $last: "$createdAt" },
          read_by_recipients: { $last: "$read_by_recipients" },
        },
      },
      { $sort: { createdAt: -1 } },
      // do a join on another table called users, and
      // get me a user whose _id = post_by_user
      {
        $lookup: {
          from: "users",
          localField: "post_by_user",
          foreignField: "_id",
          as: "post_by_user",
        },
      },
      { $unwind: "$post_by_user" },
      // do a join on another table called chatrooms, and
      // get me room details
      {
        $lookup: {
          from: "chat_rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room_info",
        },
      },
      { $unwind: "$room_info" },
      { $unwind: "$room_info.user_ids" },
      // do a join on another table called users
      {
        $lookup: {
          from: "users",
          localField: "room_info.user_ids",
          foreignField: "_id",
          as: "room_info.users_ids",
        },
      },
      { $unwind: "$read_by_recipients" },
      // do a join on another table called users
      {
        $lookup: {
          from: "users",
          localField: "read_by_recipients.read_by_User_id",
          foreignField: "_id",
          as: "read_by_recipients.read_by_user",
        },
      },

      {
        $group: {
          _id: "$room_info._id",
          message_id: { $last: "$message_id" },
          chat_room_id: { $last: "$chat_room_id" },
          message: { $last: "$message" },
          type: { $last: "$type" },
          post_by_user: { $last: "$post_by_user" },
          read_by_recipients: { $addToSet: "$read_by_recipients" },
          roomInfo: { $addToSet: "$roomInfo.users" },
          created_at: { $last: "$createdAt" },
        },
      },
      // apply pagination
      { $skip: options.page * options.limit },
      { $limit: options.limit },
    ]);
  } catch (error) {
    throw error;
  }
};

/**
 * @param {String} chat_room_id - chat room id
 * @param {String} currentUserOnlineId - user id
 */
chatMessageSchema.statics.markMessageRead = async function (
  chat_room_id,
  currentUserOnlineId
) {
  try {
    const update = await this.updateMany(
      {
        chat_room_id,
        "read_by_recipients.read_by_user_id": { $ne: currentUserOnlineId },
      },
      {
        $addToSet: {
          read_by_recipients: { read_by_user_id: currentUserOnlineId },
        },
      },
      {
        multi: true,
      }
    );

    return update;
  } catch (error) {
    throw error;
  }
};

/**
 * @param {Array} chat_room_ids - chat room ids
 * @param {{ page, limit }} options - pagination options
 * @param {String} currentUserOnlineId - user id
 */
chatMessageSchema.statics.getRecentConversation = async function (
  chat_room_ids,
  options,
  currentUserOnlineId
) {
  try {
    const rooms = this.aggregate([
      { $match: { chat_room_id: { $in: chat_room_ids } } },
      {
        $group: {
          _id: "$chat_room_id",
          message_id: { $last: "$_id" },
          chat_room_id: { $last: "$chat_room_id" },
          message: { $last: "$message" },
          type: { $last: "$type" },
          post_by_user: { $last: "$post_by_user" },
          created_at: { $last: "$createdAt" },
          read_by_recipients: { $last: "$read_by_recipients" },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "post_by_user",
          foreignField: "_id",
          as: "post_by_user",
        },
      },
      { $unwind: "$posted_by_user" },
      // // do a join on another table called chat_rooms, and
      // // get me room details
      {
        $lookup: {
          from: "chat_rooms",
          localField: "chat_room_id",
          foreignField: "chat_room_id",
          as: "room_info",
        },
      },
    ]);
    return rooms;
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};
chatMessageSchema.statics.findMessage = async function (message_id) {
  try {
    const message = await this.aggregate([
      { $match: { _id: { $in: message_id } } },

      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$file" },
          pipeline: [
            { $match: { $expr: { $in: ["$filename", "$$file"] } } },
            {
              $project: {
                _id: "$_id",
                filename: "$filename",
                mime_type: "$contentType",
                name: "$metadata.name",
              },
            },
          ],
          as: "file",
        },
      },
    ]);

    return message;
  } catch (error) {
    throw error;
  }
};

chatMessageSchema.statics.deleteMessages = async function (
  message_ids,
  current_user_id
) {
  try {
    const update = await this.updateMany(
      {
        _id: { $in: message_ids },
        "delete_by_users.delete_by_user_id": { $ne: current_user_id },
      },
      {
        $addToSet: {
          delete_by_users: { delete_by_user_id: current_user_id },
        },
      },
      {
        multi: true,
      }
    );

    return update;
  } catch (error) {
    throw error;
  }
};

export default mongoose.model("ChatMessage", chatMessageSchema);
