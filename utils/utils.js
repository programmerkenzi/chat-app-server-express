/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-18 13:19:55
 * @LastEditTime: 2021-07-19 18:28:50
 * @LastEditors: Kenzi
 */
import { online_users } from "./WebSockets.js";

export const emitUsersExceptSender = (
  currentLoggedUserSocketId,
  user_ids,
  event,
  data
) => {
  user_ids.forEach((user) => {
    const theUserIsOnline = online_users.filter((ou) => ou.user_id === user);
    if (theUserIsOnline.length > 0) {
      theUserIsOnline.forEach((user) => {
        const socket_id = user.socket_id;

        if (socket_id !== currentLoggedUserSocketId) {
          global.io.sockets.to(user.socket_id).emit(event, { data: data });
        }
      });
    }
  });
};
