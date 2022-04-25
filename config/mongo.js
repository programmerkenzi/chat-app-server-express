/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-08-09 09:37:55
 * @LastEditors: Kenzi
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
const config = dotenv.config();

export const MONGO_URL = process.env.MANGO_DB_URL_PRODUCTION;
// export const MONGO_URL = process.env.MANGO_DB_URL_DEVELOPMENT;




mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

export let gfs;

mongoose.connection.once("open", () => {
  // initialize stream
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });
});

mongoose.connection.on("connected", () => {
  console.log("Mongo has connected succesfully");
});
mongoose.connection.on("reconnected", () => {
  console.log("Mongo has reconnected");
});
mongoose.connection.on("error", (error) => {
  console.log("Mongo connection has an error", error);
  mongoose.disconnect();
});
mongoose.connection.on("disconnected", () => {
  console.log("Mongo connection is disconnected");
});
