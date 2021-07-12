/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-07-13 14:39:21
 * @LastEditors: Kenzi
 */

import jwt from "jsonwebtoken";
import user from "../controllers/user.js";
import makeValidation from "@withvoid/make-validation";
import bcrypt from "bcrypt";
import { online_users } from "../utils/WebSockets.js";
const SECRET_KEY = "some-secret-key";
const expiresIn = "2h";
export const encode = async (req, res, next) => {
  try {
    const validation = makeValidation((types) => ({
      payload: req.body,
      checks: {
        username: { type: types.string, required: true },
        password: { type: types.string, required: true },
      },
    }));
    if (!validation.success) return res.status(400).json({ ...validation });
    const { username, password } = req.body;
    //查找用户
    const hasUser = await user.onGetUserByUsername(username);
    if (hasUser) {
      //核对密码
      const validPass = await bcrypt.compareSync(password, hasUser.password);
      if (!validPass)
        return res
          .status(400)
          .send({ success: false, message: "Password is wrong" });
      const payload = {
        user_id: hasUser._id,
      };

      //创建token

      const authToken = jwt.sign(payload, SECRET_KEY, { expiresIn: expiresIn });
      req.expiresIn = expiresIn;
      req.authToken = authToken;
      req.userInfo = {
        _id: hasUser._id,
        avatar: hasUser.avatar,
        name: hasUser.name,
        status: hasUser.status,
        public_id: hasUser.public_id,
        username: hasUser.username,
      };
    }

    if (!hasUser)
      return res
        .status(400)
        .send({ success: false, message: "Username is wrong or no such user" });

    next();
  } catch (error) {
    console.log("error :>> ", error);
    return res.status(400).json({ success: false, message: error });
  }
};

export const decode = (req, res, next) => {
  if (!req.headers["authorization"]) {
    return res
      .status(400)
      .json({ success: false, message: "No access token provided" });
  }
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    const client_socket_id = req.headers.socket_id;
    console.log("client_socket_id :>> ", client_socket_id);
    console.log("req.headers :>> ", req.headers);
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    const user_id = decoded.user_id;
    console.log(" decoded user_id :>> ", user_id);
    req.user_id = user_id;
    req.socket_id = client_socket_id;
    return next();
  } catch (error) {
    console.log("error :>> ", error);
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
};

export const decodeUrl = (req, res, next) => {
  if (!req.params.token) {
    return res
      .status(400)
      .json({ success: false, message: "No access token provided" });
  }
  const accessToken = req.params.token;

  try {
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    const user_id = decoded.user_id;
    req.user_id = user_id;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
};

export const refreshToken = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) {
      return res
        .status(400)
        .json({ success: false, message: "No access token provided" });
    }
    const accessToken = req.headers.authorization.split(" ")[1];

    const client_socket_id = req.headers.socket_id;
    try {
      const decoded = jwt.verify(accessToken, SECRET_KEY);
      const user_id = decoded.user_id;
      req.user_id = user_id;
      req.socket_id = client_socket_id;
      const payload = {
        user_id: user_id,
      };
      const newAuthToken = jwt.sign(payload, SECRET_KEY, {
        expiresIn: expiresIn,
      });
      req.expiresIn = expiresIn;
      req.refreshToken = newAuthToken;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: "unauthorized" });
    }
  } catch (error) {}
};
