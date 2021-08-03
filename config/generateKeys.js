/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-07-19 10:45:39
 * @LastEditTime: 2021-08-03 11:40:47
 * @LastEditors: Kenzi
 */

import crypto from "crypto";

const key1 = crypto.randomBytes(32).toString("hex");
const key2 = crypto.randomBytes(32).toString("hex");
console.table({ key1, key2 });
