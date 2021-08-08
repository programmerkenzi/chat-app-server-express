/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:22
 * @LastEditTime: 2021-08-06 16:17:17
 * @LastEditors: Kenzi
 */
import http from "http";
import express from "express";
import logger from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import createError from "http-errors";
//redis connection
import "./config/redis.js";
// mongo connection
import "./config/mongo.js";
// socket configuration
import WebSockets from "./utils/WebSockets.js";
// routes
import indexRouter from "./routes/index.js";
import userRouter from "./routes/user.js";
import chatRoomRouter from "./routes/chatRoom.js";
import deleteRouter from "./routes/delete.js";
import fsRouter from "./routes/fs.js";
import notificationRouter from "./routes/notification.js";
// middlewares
import decode from "./middlewares/jwt.js";

const app = express();

/** Get port from environment and store in Express. */
const port = process.env.PORT || "3000";
app.set("port", port);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: "100mb" }));

app.use("/", indexRouter);
app.use("/users", decode.verifyAccessToken, userRouter);
app.use("/room", decode.verifyAccessToken, chatRoomRouter);
app.use("/notification", decode.verifyAccessToken, notificationRouter);
app.use("/fs", fsRouter);

app.use("/delete", decode.verifyAccessToken, deleteRouter);

/**  error handler */
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

/** Create HTTP server. */
const server = http.createServer(app);
/** Create socket connection */
const io = new Server(server);
global.io = io.listen(server);
global.io.on("connection", WebSockets.connection);
/** Listen on provided port, on all network interfaces. */
server.listen(port);
/** Event listener for HTTP server "listening" event. */
server.on("listening", () => {
  console.log(`Listening on port:: http://localhost:${port}/`);
});
