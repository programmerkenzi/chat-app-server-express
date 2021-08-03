/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-16 10:28:27
 * @LastEditTime: 2021-08-03 13:56:52
 * @LastEditors: Kenzi
 */
import express from "express";
// middlewares
import decode from "../middlewares/jwt.js";
import User from "../controllers/user.js";

const router = express.Router();

router
  .post(
    "/login",
    decode.signAccessToken,
    decode.signRefreshToken,
    (req, res, next) => {
      return res.status(200).json({
        success: true,
        accessToken: "Bearer " + req.accessToken,
        refreshToken: "Bearer " + req.refreshToken,
        publicKey: req.publicKey,
        privateKey: req.privateKey,
        userInfo: req.userInfo,
      });
    }
  )
  .post("/refresh-token", decode.verifyRefreshToken, (req, res, next) => {
    return res.status(200).json({
      success: true,
      accessToken: "Bearer " + req.accessToken,
      refreshToken: "Bearer " + req.refreshToken,
    });
  })
  .post("/logout", User.onLogout);

export default router;
