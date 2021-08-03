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
    message: Object,
    file: { type: Array, default: [] },
    post_by_user: { type: String, required: true },
    read_by_recipients: [read_by_recipientSchema],
    delete_by_users: [delete_by_userSchema],
    forwarded_from_message_ids: { type: Array, default: [] },
    reply_for_message_id: String,
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
  user_id
) {
  try {
    const post = await this.create({
      chat_room_id: room_id,
      message: message ? message : "",
      file: file ? file : [],
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

          as: "post_by_user",
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
          post_by_user: "$post_by_user",
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
    let conversation = await this.aggregate([
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
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      {
        $lookup: {
          from: "chat_messages",
          let: {
            forwarded_from_message_ids: "$forwarded_from_message_ids",
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$forwarded_from_message_ids"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "forwarded_from_messages",
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
                post_by_user: "$post_by_user",
                forwarded_from_messages: "$forwarded_from_messages",
                reply_for_message: "$reply_for_message",
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
    const forwardedConversations = await this.aggregate([
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
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      {
        $lookup: {
          from: "chat_messages",
          let: {
            forwarded_from_message_ids: "$forwarded_from_message_ids",
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$forwarded_from_message_ids"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "forwarded_from_messages",
        },
      },

      { $unwind: "$forwarded_from_messages" },

      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$forwarded_from_messages.post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                name: "$name",
              },
            },
          ],
          as: "forwarded_from_messages.post_by_user",
        },
      },
      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$forwarded_from_messages.file" },
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
          as: "forwarded_from_messages.file",
        },
      },

      {
        $project: {
          _id: "$_id",
          from_id: "$forwarded_from_messages._id",
          message: "$forwarded_from_messages.message",
          file: "$forwarded_from_messages.file",
          post_by_user: "$forwarded_from_messages.post_by_user",
        },
      },
    ]);

    const replyConversations = await this.aggregate([
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
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      { $unwind: "$reply_for_message" },

      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$reply_for_message.post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                name: "$name",
              },
            },
          ],
          as: "reply_for_message.post_by_user",
        },
      },
      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$reply_for_message.file" },
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
          as: "reply_for_message.file",
        },
      },
      {
        $project: {
          _id: "$_id",
          from_id: "$reply_for_message._id",
          message: "$reply_for_message.message",
          file: "$reply_for_message.file",
          post_by_user: "$reply_for_message.post_by_user",
        },
      },
    ]);

    //加入轉發與回復訊息info
    if (conversation.length) {
      const insertForwardedAndReplyInfo = conversation[0].data.map((msg) => {
        const { forwarded_from_messages, reply_for_message, _id } = msg;

        let newMsg = { ...msg };

        if (forwarded_from_messages.length) {
          const forwarded_from_messages_filter = forwardedConversations.filter(
            (forwardedConversation) => forwardedConversation._id === _id
          );

          newMsg = {
            ...msg,
            forwarded_from_messages: forwarded_from_messages_filter,
          };
        }
        if (reply_for_message.length) {
          const reply_for_message_filter = replyConversations.filter(
            (replyConversation) => replyConversation._id === _id
          );

          newMsg = {
            ...msg,
            reply_for_message: reply_for_message_filter,
          };
        }
        return newMsg;
      });
      return { data: insertForwardedAndReplyInfo, meta: conversation[0].meta };
    }

    return {
      data: [],
      meta: {
        total: 0,
        limit: options.limit,
        page: 1,
        pages: 1,
      },
    };
  } catch (error) {
    console.log("error :>> ", error);
    throw error;
  }
};

/**
 * @param {Array} chat_room_ids - chat room ids
 * @param {{ page, limit }} options - pagination options
 * @param {String} currentUserOnlineId - user id
 */

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

chatMessageSchema.statics.findMessage = async function (message_id) {
  try {
    let conversation = await this.aggregate([
      { $match: { _id: { $in: message_id } } },

      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      {
        $lookup: {
          from: "chat_messages",
          let: {
            forwarded_from_message_ids: "$forwarded_from_message_ids",
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$forwarded_from_message_ids"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "forwarded_from_messages",
        },
      },

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
          post_by_user: "$post_by_user",
          forwarded_from_messages: "$forwarded_from_messages",
          reply_for_message: "$reply_for_message",
        },
      },
    ]);
    const forwardedConversations = await this.aggregate([
      { $match: { _id: { $in: message_id } } },

      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      {
        $lookup: {
          from: "chat_messages",
          let: {
            forwarded_from_message_ids: "$forwarded_from_message_ids",
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$forwarded_from_message_ids"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "forwarded_from_messages",
        },
      },

      { $unwind: "$forwarded_from_messages" },

      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$forwarded_from_messages.post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                name: "$name",
              },
            },
          ],
          as: "forwarded_from_messages.post_by_user",
        },
      },
      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$forwarded_from_messages.file" },
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
          as: "forwarded_from_messages.file",
        },
      },

      {
        $project: {
          _id: "$_id",
          from_id: "$forwarded_from_messages._id",
          message: "$forwarded_from_messages.message",
          file: "$forwarded_from_messages.file",
          post_by_user: "$forwarded_from_messages.post_by_user",
        },
      },
    ]);

    const replyConversations = await this.aggregate([
      { $match: { _id: { $in: message_id } } },

      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: {
            post_by_user: "$post_by_user",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$_id", "$$post_by_user"] }],
                },
              },
            },
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

          as: "post_by_user",
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
        $lookup: {
          from: "chat_messages",
          let: {
            reply_for_message_id: "$reply_for_message_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$reply_for_message_id"] },
              },
            },
            {
              $project: {
                message: "$message",
                file: "$file",
                post_by_user: "$post_by_user",
              },
            },
          ],
          as: "reply_for_message",
        },
      },

      { $unwind: "$reply_for_message" },

      {
        $lookup: {
          from: "users",
          let: { post_by_user: "$reply_for_message.post_by_user" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$post_by_user"] } } },
            {
              $project: {
                _id: "$_id",
                name: "$name",
              },
            },
          ],
          as: "reply_for_message.post_by_user",
        },
      },
      {
        $lookup: {
          from: "uploads.files",
          let: { file: "$reply_for_message.file" },
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
          as: "reply_for_message.file",
        },
      },
      {
        $project: {
          _id: "$_id",
          from_id: "$reply_for_message._id",
          message: "$reply_for_message.message",
          file: "$reply_for_message.file",
          post_by_user: "$reply_for_message.post_by_user",
        },
      },
    ]);

    //加入轉發與回復訊息info
    const insertForwardedAndReplyInfo = conversation.map((msg) => {
      const { forwarded_from_messages, reply_for_message, _id } = msg;

      let newMsg = { ...msg };

      if (forwarded_from_messages.length) {
        const forwarded_from_messages_filter = forwardedConversations.filter(
          (forwardedConversation) => forwardedConversation._id === _id
        );

        newMsg = {
          ...msg,
          forwarded_from_messages: forwarded_from_messages_filter,
        };
      }
      if (reply_for_message.length) {
        const reply_for_message_filter = replyConversations.filter(
          (replyConversation) => replyConversation._id === _id
        );

        newMsg = {
          ...msg,
          reply_for_message: reply_for_message_filter,
        };
      }
      return newMsg;
    });
    return insertForwardedAndReplyInfo;
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

chatMessageSchema.statics.forwardMessages = async function (
  file,
  message,
  user_id,
  to_room_id,
  message_ids
) {
  try {
    const post = await this.create({
      chat_room_id: to_room_id,
      message: message ? message : "",
      file: file ? file : [],
      post_by_user: user_id,
      read_by_recipients: { read_by_user_id: user_id },
      forwarded_from_message_ids: message_ids,
    });

    return post;
  } catch (error) {
    throw error;
  }
};

chatMessageSchema.statics.replyMessage = async function (
  message,
  file,
  user_id,
  to_room_id,
  reply_message_id
) {
  try {
    const post = await this.create({
      chat_room_id: to_room_id,
      message: message ? message : "",
      file: file ? file : [],
      post_by_user: user_id,
      read_by_recipients: { read_by_user_id: user_id },
      reply_for_message_id: reply_message_id,
    });

    return post;
  } catch (error) {
    throw error;
  }
};

export default mongoose.model("ChatMessage", chatMessageSchema);
