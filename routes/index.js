/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:27
 * @LastEditTime: 2021-07-02 13:01:52
 * @LastEditors: Kenzi
 */
import express from "express";
// middlewares
import { encode } from "../middlewares/jwt.js";

const router = express.Router();

router.post("/login/:user_id", encode, (req, res, next) => {
  return res.status(200).json({
    success: true,
    authorization: req.authToken,
  });
});

export default router;
