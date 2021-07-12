/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-07-12 10:38:31
 * @LastEditors: Kenzi
 */
import OnlineUsers from "../models/OnlineUsers.js";
import Users from "../models/Users.js";

export let online_users = [];

class WebSockets {
  connection(client) {
    client.on("disconnect", () => {
      online_users = online_users.filter(
        (user) => user.socket_id !== client.id
      );
      // console.log(` disconnected client.id`, online_users);
    });

    //将用户帐号与socket_id配对在一起作为用户辨识
    client.on("identity", (user) => {
      const isExistDevice = online_users.findIndex(
        (ou) => ou.device_id === user.device_id
      );

      if (isExistDevice !== -1) {
        online_users[isExistDevice] = {
          user_id: user.user_id,
          socket_id: client.id,
          device_id: user.device_id,
        };
      } else {
        online_users.push({
          user_id: user.user_id,
          socket_id: client.id,
          device_id: user.device_id,
        });
      }

      // console.log("online_users :>> ", online_users);
      // Users.findUsersFriends(username);
    });
    // subscribe person to chat & other user as well
    client.on("subscribe", (room, otherUserId = "") => {
      subscribeOtherUser(room, otherUserId);
      client.join(room);
    });
    // mute a chat room
    client.on("unsubscribe", (room) => {
      client.leave(room);
    });
  }

  subscribeOtherUser(room, otherUserId) {
    const userSockets = users.filter((user) => user.userId === otherUserId);
    userSockets.map((userInfo) => {
      const socketConn = global.io.sockets.connected(userInfo.socketId);
      if (socketConn) {
        socketConn.join(room);
      }
    });
  }
}

export default new WebSockets();
