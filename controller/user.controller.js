const model = require("../models");
const User = model.users;
const Utils = require("../helpers/common");
const Authentication = require("../helpers/authToken");
const mongoose = require("mongoose");
const config = require("../config/db.config");
const { decryptPassword, requiredParameterValidation, upload } = Utils;
exports.login = async (req, res, next) => {
  try {
    const { body, headers } = req;
    const origin = headers?.origin?.split("://")?.[1] || "";
    const mandatoryFields = ["username", "password"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    //--------------------Bulk Operation Sample-------------------
    // User.bulkWrite([                                         //
    //   {                                                      //
    //     insertOne: {                                         //
    //       document: {                                        //
    //         username: "BulkUser",                            //
    //         password: body.password,                         //
    //       },                                                 //
    //     },                                                   //
    //   },                                                     //
    //   {                                                      //
    //     updateOne: {                                         //
    //       filter: { username: "BulkUser" },                  //
    //       update: { username: "BulkUser Updated" },          //
    //     },                                                   //
    //   },                                                     //
    // ]).then((result) => console.log(result, "bulkoperation"));  //
    //------------------------------------------------------------
    User.find({ username: body.username })
      .then((data) => {
        if (
          data?.length &&
          decryptPassword(data[0].password, 1) ===
            decryptPassword(body.password, 2)
        ) {
          let result = {};
          if (data[0].profile_pic) {
            result = {
              image: data[0]?.profile_pic?.image?.toString("binary"),
              contentType: data[0]?.profile_pic?.contentType,
            };
          }
          const accessToken = Authentication.getAccessToken({
            user_id: data[0]._id,
          });
          const refreshToken = Authentication.getRefreshToken({
            user_id: data[0]._id,
          });
          res.clearCookie(`token_${origin}`);
          res
            .cookie(`token_${origin}`, accessToken, {
              httpOnly: true,
              maxAge: new Date(
                new Date().getTime() + Number(config.token_expiry)
              ),
              // path: headers.origin.replace("http:/", ""),
            })
            .send({
              status: 1,
              message: "Success",
              data: { refreshToken, ...data[0]._doc, profile_pic: result },
            });
        } else {
          return next({
            status: 401,
            message: "Invalid Username or Password",
          });
        }
      })
      .catch((err) => {
        next(err);
      });
  } catch (err) {
    next(err);
  }
};
exports.createUser = async (req, res, next) => {
  try {
    const { body, headers } = req;
    const origin = headers?.origin?.split("://")?.[1] || "";
    const mandatoryFields = ["username", "password"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    const isUserExist = await User.findOne({
      username: { $eq: body.username },
    });
    if (isUserExist) {
      next({
        status: 409,
        message: "Username already exist",
      });
    } else {
      // const hashedEncrypt = encryptPassword(body.password);
      // const hashedContent = { ...body, password: hashedEncrypt };
      User.create(body)
        .then((data) => {
          res.send({
            status: 200,
            message: "User successfully created",
          });
        })
        .catch((err) => next(err));
    }
  } catch (err) {
    next(err);
  }
};
exports.refreshToken = (req, res, next) => {
  try {
    const origin = req?.headers?.origin?.split("://")?.[1] || "";
    const accessToken = Authentication.getAccessToken({
      user_id: req.user_id,
    });
    const refreshToken = Authentication.getRefreshToken({
      user_id: req.user_id,
    });
    res.clearCookie(`token_${origin}`);
    res
      .cookie(`token_${origin}`, accessToken, {
        httpOnly: true,
        maxAge: new Date(new Date().getTime() + Number(config.token_expiry)),
      })
      .send({
        status: 1,
        data: { refreshToken },
      });
  } catch (err) {
    next(err);
  }
};
exports.getUser = (req, res, next) => {
  try {
    if (req.body.username) {
      User.find({
        username: { $regex: new RegExp(`^${req.body.username}`, "i") },
        _id: { $ne: new mongoose.Types.ObjectId(req.user_id) },
      })
        .select("-password")
        .then((result) => {
          res.send({
            status: 200,
            data: result,
          });
        })
        .catch((err) => next(err));
    }
  } catch (err) {
    next(err);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    const { body } = req;
    let payload;
    let files = await req?.files?.[0];
    if (Object.keys(body)?.length || files) {
      if (files) {
        payload = {
          image: files?.buffer,
          contentType: files?.mimetype,
        };
      }
      User.findByIdAndUpdate(
        req.user_id,
        payload ? { ...body, profile_pic: payload } : body,
        { new: true }
      )
        .then((data) => {
          let result = {};
          if (data.profile_pic) {
            result = {
              image: data?.profile_pic?.image?.toString("binary"),
              contentType: data?.profile_pic?.contentType,
            };
          }
          // const bsonData = Buffer.from(data.profile_pic, "base64");
          // const binaryStream = bsonData.toString("binary");
          // const base64String = bsonData.toString("base64");
          res.send({
            status: 200,
            data: { ...data._doc, profile_pic: result },
          });
        })
        .catch((err) => {
          next(err);
        });
    } else {
      next({
        status: 409,
        message: "No field to update",
      });
    }
  } catch (err) {
    next(err);
  }
};
