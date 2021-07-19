/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-07-19 10:37:39
 * @LastEditTime: 2021-07-19 18:04:59
 * @LastEditors: Kenzi
 */

import redis from "async-redis";

const client = redis.createClient({
  port: 6379,
  host: "localhost",
  password: "210203201",
});

client.on("connect", () => {
  console.log("Client connected to redis...");
});

client.on("ready", () => {
  console.log("Client connected to redis and ready to use...");
});

client.on("error", (err) => {
  console.log(err.message);
});

client.on("end", () => {
  console.log("Client disconnected from redis");
});

process.on("SIGINT", () => {
  client.quit();
});

export default client;
