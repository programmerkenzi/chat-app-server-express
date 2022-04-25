/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-07-19 10:37:39
 * @LastEditTime: 2021-07-20 12:10:23
 * @LastEditors: Kenzi
 */

import redis from "async-redis";
import dotenv from "dotenv";
const config = dotenv.config();

const url = process.env.REDIS_URL_PRODUCTION;
const password = process.env.REDIS_USER_PASSWORD;


const client = redis.createClient({
  port: 11219,
  host: url,
  password: password,
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
