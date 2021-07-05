/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-25 15:07:38
 * @LastEditTime: 2021-06-30 09:42:23
 * @LastEditors: Kenzi
 */

import { gfs } from "../config/mongo.js";
export default {
  downloadFile: async (req, res) => {
    try {
      const files = await gfs.find({ filename: req.params.filename }).toArray();
      if (!files[0] || files.length === 0) {
        return res.status(200).json({
          success: false,
          message: "No files available",
        });
      } else {
        return gfs.openDownloadStreamByName(req.params.filename).pipe(res);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error,
      });
    }
  },
  getFile: async (req, res) => {
    try {
      const files = await gfs.find({ filename: req.params.filename }).toArray();
      if (files.length > 0) {
        return res.status(200).json({
          success: true,
          file: files[0],
        });
      } else {
        return res.status(200).json({
          success: false,
          message: "No files available",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "error",
      });
    }
  },
};
