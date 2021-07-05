/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:22
 * @LastEditTime: 2021-07-05 16:47:40
 * @LastEditors: Kenzi
 */
import http from "http";
import express from "express";
import logger from "morgan";
import cors from "cors";
import { Server } from "socket.io";
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
import { decode } from "./middlewares/jwt.js";
import upload from "./utils/storage.js";

const app = express();

/** Get port from environment and store in Express. */
const port = process.env.PORT || "3000";
app.set("port", port);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", indexRouter);
app.use("/users", decode, userRouter);
app.use("/room", decode, chatRoomRouter);
app.use("/notification", decode, notificationRouter);
app.use("/fs", fsRouter);

app.use("/delete", decode, deleteRouter);

/** catch 404 and forward to error handler */
app.use("*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint doesnt exist",
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
