/*
 * @Description:
 * @Author: Kenzi
 * @Date: 2021-06-10 18:32:02
 * @LastEditTime: 2021-06-29 17:45:36
 * @LastEditors: Kenzi
 */

import jwt from "jsonwebtoken";
import user from "../controllers/user.js";

const SECRET_KEY = "some-secret-key";

export const encode = async (req, res, next) => {
  try {
    const theUser = await user.onGetUserById(req);
    const payload = {
      user_id: theUser[0]._id,
    };
    const authToken = jwt.sign(payload, SECRET_KEY);
    req.authToken = authToken;
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.error });
  }
};

export const decode = (req, res, next) => {
  if (!req.headers["authorization"]) {
    return res
      .status(400)
      .json({ success: false, message: "No access token provided" });
  }
  const accessToken = req.headers.authorization.split(" ")[1];

  //console.log("accessToken :>> ", accessToken);

  const client_socket_id = req.headers.socket_id;
  try {
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    const user_id = decoded.user_id;
    req.user_id = user_id;
    req.socket_id = client_socket_id;
    return next();
  } catch (error) {
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

  // console.log("accessToken :>> ", accessToken);

  try {
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    const user_id = decoded.user_id;
    req.user_id = user_id;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
};
