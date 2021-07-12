/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:27
 * @LastEditTime: 2021-07-12 11:27:58
 * @LastEditors: Kenzi
 */
import express from "express";
// middlewares
import { encode, decode, refreshToken } from "../middlewares/jwt.js";
import User from "../controllers/user.js";

const router = express.Router();

router
  .post("/login", encode, (req, res, next) => {
    return res.status(200).json({
      success: true,
      authorization: "Bearer " + req.authToken,
      expires_in: req.expiresIn,
      userInfo: req.userInfo,
    });
  })
  .post("/refresh-token", refreshToken, (req, res, next) => {
    return res.status(200).json({
      success: true,
      refreshToken: req.refreshToken,
      expires_in: req.expiresIn,
    });
  })
  .post("/logout", decode, User.onLogout);

export default router;
