/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-25 14:59:00
 * @LastEditTime: 2021-06-28 11:33:17
 * @LastEditors: Kenzi
 */

import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import { MONGO_URL } from "../config/mongo.js";
import path from "path";
import crypto from "crypto";

const storage = new GridFsStorage({
  url: MONGO_URL,

  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          metadata: { name: file.originalname },
          bucketName: "uploads",
        };
        req.filename = filename;
        req.original_name = file.originalname;
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

export default upload;
