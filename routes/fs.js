/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-25 15:05:27
 * @LastEditTime: 2021-07-19 12:08:33
 * @LastEditors: Kenzi
 */

import express from "express";
import decode from "../middlewares/jwt.js";
import fs from "../controllers/fs.js";
import upload from "../utils/storage.js";
import { gfs } from "./../config/mongo.js";

const router = express.Router();

router
  .post(
    "/",
    decode.verifyAccessToken,
    upload.array("files"),
    async (req, res, next) => {
      try {
        const reqFiles = [];
        const files = req.files;
        for (var i = 0; i < files.length; i++) {
          const md5 = files[i].md5;
          //档案是否已经存在,存在则删除最后上传的
          const fileIsExist = await gfs.find({ md5: md5 }).toArray();
          if (fileIsExist.length > 1) {
            const fileId = fileIsExist[1]._id;
            const deleteFile = await gfs.delete(fileId);
            reqFiles.push(fileIsExist[0].filename);
          } else {
            reqFiles.push(files[i].filename);
          }
        }
        return res.status(200).json({
          success: true,
          file: reqFiles,
        });
      } catch (error) {
        console.log("error :>> ", error);
        return res.status(500).json({
          success: false,
        });
      }
    }
  )
  .get("/:filename", decode.verifyAccessToken, fs.getFile)
  .get("/download/:filename/:token", decode.verifyAccessToken, fs.downloadFile);

export default router;
