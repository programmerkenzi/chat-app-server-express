/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-18 13:19:55
 * @LastEditTime: 2021-07-02 18:32:46
 * @LastEditors: Kenzi
 */
import { online_users } from "./WebSockets.js";

export const emitUsersExceptSender = (
  currentLoggedUserSocketId,
  user_ids,
  event,
  data
) => {
  console.log(" emilt user_ids :>> ", user_ids);

  user_ids.forEach((user) => {
    const theUserIsOnline = online_users.filter((ou) => ou.user_id === user);
    console.log("theUserIsOnline :>> ", theUserIsOnline);
    if (theUserIsOnline.length > 0) {
      theUserIsOnline.forEach((user) => {
        const socket_id = user.socket_id;
        console.log("socket.id :>> ", socket_id);
        console.log(
          "currentLoggedUserSocketId :>> ",
          currentLoggedUserSocketId
        );
        if (socket_id !== currentLoggedUserSocketId) {
          console.log("emit!!! :>>  ", event);
          global.io.sockets.to(user.socket_id).emit(event, { data: data });
        }
      });
    }
  });
};
