/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-08-05 12:50:18
 * @LastEditTime: 2021-08-05 13:25:05
 * @LastEditors: Kenzi
 */

import ChatMessageModel from "../models/ChatMessage.js";

export const fetchConversationsIncludedPinnedMessages = async (
  room_id,
  currentLoggedUser,
  firstPinnedMessageId,
  paginationOptions,
  conversationsFetched = []
) => {
  const { page, limit } = paginationOptions;
  let conversations = [...conversationsFetched];

  const fetchData = await ChatMessageModel.getConversationByRoomId(
    room_id,
    currentLoggedUser,
    paginationOptions
  );

  const isIncludedFirstPinMessage = fetchData.data.findIndex(
    (msg) => msg._id === firstPinnedMessageId
  );

  if (isIncludedFirstPinMessage !== -1) {
    conversations = {
      data: [...conversations, ...fetchData.data],
      meta: fetchData.meta,
    };

    return conversations;
  } else {
    conversations = [...conversations, ...fetchData.data];

    return fetchConversationsIncludedPinnedMessages(
      room_id,
      currentLoggedUser,
      firstPinnedMessageId,
      { page: page + 1, limit: limit },
      conversations
    );
  }
};
