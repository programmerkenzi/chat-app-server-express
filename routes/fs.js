/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-25 15:05:27
 * @LastEditTime: 2021-07-01 11:17:04
 * @LastEditors: Kenzi
 */

import express from "express";
import { decode, decodeUrl } from "../middlewares/jwt.js";
import fs from "../controllers/fs.js";
import upload from "../utils/storage.js";

const router = express.Router();

router
  .post("/", decode, upload.array("files"), (req, res, next) => {
    const reqFiles = [];

    for (var i = 0; i < req.files.length; i++) {
      reqFiles.push(req.files[i].filename);
    }
    return res.status(200).json({
      success: true,
      file: reqFiles,
    });
  })
  .get("/:filename", decode, fs.getFile)
  .get("/download/:filename/:token", decodeUrl, fs.downloadFile);

export default router;
