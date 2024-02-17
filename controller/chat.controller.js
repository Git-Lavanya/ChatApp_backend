const { chat: Chat, users: User, chat } = require("../models");
const { requiredParameterValidation } = require("../helpers/common");
const mongoose = require("mongoose");

exports.getChat = async (req, res, next) => {
  try {
    const { body } = req;
    const mandatoryFields = ["receiverId"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    var isChat = await Chat.find({
      isGroupChat: false,
      // $and: [
      //   { users: { $elemMatch: { $eq: req.user_id } } },
      //   { users: { $elemMatch: { $eq: body.receiverId } } },
      // ],
      users: { $elemMatch: { $eq: req.user_id, $eq: body.receiverId } },
    })
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "username",
    });

    if (isChat.length) {
      res.send({
        status: 200,
        data: isChat[0],
      });
    } else {
      User.find({ _id: body.receiverId }).then(async (data) => {
        if (data.length) {
          isChat = {
            chatName: "singlechat",
            isGroupChat: false,
            users: [req.user_id, body.receiverId],
          };
          const createdChat = await Chat.create(isChat);
          const chat = await Chat.findOne({ _id: createdChat._id }).populate(
            "users",
            "-password"
          );
          res.send({
            status: 200,
            data: chat,
          });
        } else {
          res.send({
            status: 200,
            data: "No username exist",
          });
        }
      });
    }
  } catch (err) {
    next(err);
  }
};
exports.getAllChats = async (req, res, next) => {
  try {
    const { user_id } = req;
    if (!user_id) {
      return next({
        status: 401,
        message: `UnAuthorized`,
      });
    }
    Chat.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "users",
          foreignField: "_id",
          as: "usersData",
        },
      },
      {
        $unwind: "$usersData",
      },
      {
        $match: {
          users: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $group: {
          _id: "$_id",
          chatName: { $first: "$chatName" },
          isGroupChat: { $first: "$isGroupChat" },
          latestMessage: { $first: "$latestMessage" },
          groupAdmin: { $first: "$groupAdmin" },
          usersData: { $push: "$usersData" },
        },
      },
      {
        $project: {
          _id: 1,
          chatName: 1,
          groupAdmin: 1,
          latestMessage: 1,
          isGroupChat: 1,
          usersData: {
            $cond: {
              if: { $eq: ["$isGroupChat", false] },
              then: {
                $filter: {
                  input: "$usersData",
                  as: "user",
                  cond: {
                    $ne: ["$$user._id", new mongoose.Types.ObjectId(user_id)],
                  },
                },
              },
              else: "$usersData",
            },
          },
        },
      },
      {
        $project: {
          _id: "$_id",
          chatName: "$chatName",
          groupAdmin: "$groupAdmin",
          latestMessage: "$latestMessage",
          isGroupChat: "$isGroupChat",
          usersData: {
            $map: {
              input: "$usersData",
              as: "user",
              in: {
                // $mergeObjects: [
                //   "$$user",
                // {
                _id: "$$user._id",
                username: "$$user.username",
                profile_pic: {
                  $function: {
                    lang: "js",
                    body: `function(profile) {
                              const func = ${ProcessBinaryStream};
                              return func(profile)
                            }`,
                    args: ["$$user.profile_pic"],
                  },
                },
                password: 0,
                // },
                // ],
              },
            },
          },
        },
      },
      // {
      //   $project: {
      //     _id: "$_id",
      //     chatName: "$chatName",
      //     isGroupChat: "$isGroupChat",
      //     latestMessage: "$latestMessage",
      //     groupAdmin: "$groupAdmin",
      //     users: {
      //       $map: {
      //         input: "$usersData",
      //         as: "user",
      //         in: {
      //           $convert: {
      //             input: "$$user._id",
      //             to: "objectId",
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
    ])
      .then(async (result) => {
        result = await Chat.populate(result, {
          path: "usersData latestMessage",
          select: "-password",
        });
        result = await Chat.populate(result, {
          path: "groupAdmin",
          select: "-profile_pic",
        });
        result = await User.populate(result, {
          path: "latestMessage.sender",
          select: "-password -profile_pic",
        });
        result = JSON.parse(
          JSON.stringify(result).replaceAll("usersData", "users")
        );
        res.send({
          status: 200,
          data: result,
        });
      })
      .catch((err) => next(err));
    //   Chat.find({ users: { $elemMatch: { $eq: body.user_id } } })
    //     .populate("users", "-password")
    //     .populate("groupAdmin", "-password")
    //     .populate("latestMessage")
    //     .sort({ updatedAt: -1 })
    //     .then(async (result) => {
    //       result = await User.populate(result, {
    //         path: "latestMessage.sender",
    //         select: "username profile_pic",
    //       });
    //       res.send({
    //         status: 200,
    //         data: result,
    //       });
    //     })
    //     .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};
exports.createGroupChat = async (req, res, next) => {
  try {
    const { body } = req;
    const mandatoryFields = ["members", "chat_name"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    let users = JSON.parse(body.members);
    if (users.length < 2) {
      return next({
        status: 409,
        message: `Group should contains more than 2 members`,
      });
    }
    users.push(req.user_id);
    const isGroupExist = await Chat.findOne({
      chatName: { $eq: body.chat_name },
      groupAdmin: { $eq: req.user_id },
    });
    if (isGroupExist) {
      next({
        status: 409,
        message: "Group already exist",
      });
      return;
    }
    Chat.create({
      chatName: body.chat_name,
      isGroupChat: true,
      users: users,
      groupAdmin: req.user_id,
    })
      .then(async (result) => {
        const chat = await Chat.findOne({ _id: result._id })
          .populate("users", "-password")
          .populate("groupAdmin", "-password");
        res.send({
          status: 200,
          data: chat,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

exports.renameGroup = (req, res, next) => {
  try {
    const { body } = req;
    const mandatoryFields = ["chat_id", "chat_name"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    Chat.findByIdAndUpdate(
      body.chat_id,
      { chatName: body.chat_name },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .then((result) => {
        res.send({
          status: 200,
          data: result,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

exports.groupMemberPrivilege = (req, res, next) => {
  try {
    const { body } = req;
    const mandatoryFields = ["user_id", "chat_id", "privilege"];
    const badRequest = requiredParameterValidation(body, mandatoryFields);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
      return;
    }
    const editOperation =
      body.privilege === 1
        ? { $pull: { users: body.user_id } }
        : { $push: { users: body.user_id } };
    Chat.findByIdAndUpdate(body.chat_id, editOperation, { new: true })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .then((updatedGroup) => {
        res.send({
          status: 200,
          data: updatedGroup,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

exports.findChat = async (req, res, next) => {
  try {
    const { query } = req;
    const badRequest = requiredParameterValidation(query, ["chatname"]);
    if (badRequest) {
      res.send({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
      return;
    }
    const regex = new RegExp(query.chatname, "i");
    const AuthUser = await User.findOne({
      _id: { $eq: new mongoose.Types.ObjectId(req.user_id) },
    });
    const ChatUser = await Chat.findOne({
      chatName: { $regex: regex },
      isGroupChat: true,
    });
    const userReg = new RegExp(`${query.chatname}`, "i");
    const isSameUser = userReg.test(AuthUser.username);
    const condition = ChatUser
      ? {
          $and: [
            { "users._id": new mongoose.Types.ObjectId(req.user_id) },
            { chatName: { $regex: regex } },
            { isGroupChat: true },
          ],
        }
      : isSameUser
      ? { _id: { $exists: false } }
      : {
          $and: [
            { "users._id": new mongoose.Types.ObjectId(req.user_id) },
            { "users.username": { $regex: regex } },
            { isGroupChat: false },
          ],
        };
    Chat.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "users",
          foreignField: "_id",
          as: "userData",
        },
      },
      {
        $unwind: "$userData",
      },
      {
        $group: {
          _id: "$_id",
          chatName: { $first: "$chatName" },
          isGroupChat: { $first: "$isGroupChat" },
          latestMessage: { $first: "$latestMessage" },
          groupAdmin: { $first: "$groupAdmin" },
          users: { $push: "$userData" },
        },
      },
      {
        $match: condition,
      },
      {
        $project: {
          _id: 1,
          chatName: 1,
          groupAdmin: 1,
          latestMessage: 1,
          isGroupChat: 1,
          users: {
            $cond: {
              if: { $eq: ["$isGroupChat", false] },
              then: {
                $filter: {
                  input: "$users",
                  as: "user",
                  cond: {
                    $ne: [
                      "$$user._id",
                      new mongoose.Types.ObjectId(req.user_id),
                    ],
                  },
                },
              },
              else: "$users",
            },
          },
        },
      },
      {
        $project: {
          _id: "$_id",
          chatName: "$chatName",
          isGroupChat: "$isGroupChat",
          latestMessage: "$latestMessage",
          groupAdmin: "$groupAdmin",
          users: {
            $map: {
              input: "$users",
              as: "user",
              in: {
                $convert: {
                  input: "$$user._id",
                  to: "objectId",
                },
              },
            },
          },
        },
      },
    ])

      .then(async (result) => {
        let data = [];
        if (result?.length) {
          data = await Chat.populate(result, {
            path: "users latestMessage",
            select: "-password",
          });
          data = await Chat.populate(result, {
            path: "groupAdmin",
            select: "-password -profile_pic",
          });
          data = await User.populate(result, {
            path: "latestMessage.sender",
            select: "-password -profile_pic",
          });
        } else {
          const searchedUser = await User.find({ username: { $regex: regex } });
          if (searchedUser.length && !isSameUser) {
            const result = await Chat.create({
              chatName: "singlechat",
              isGroupChat: false,
              users: [req.user_id, searchedUser[0]._id],
            });
            let newChat = await Chat.findOne({
              _id: new mongoose.Types.ObjectId(result._id),
            }).populate("users", "-password");
            newChat.users = [newChat.users[1]];
            data.push(newChat);
          }
        }
        res.send({
          status: 200,
          data,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

exports.deleteChat = (req, res, next) => {
  try {
    const badRequest = requiredParameterValidation(req.body);
    if (badRequest) {
      next({
        status: 400,
        message: `Required ${badRequest} field`,
      });
      return;
    }
    Chat.deleteMany({ _id: { $in: req.body.chat_id } })
      .then((result) => {
        res.send({
          status: 200,
          data: result,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

function ProcessBinaryStream(profile) {
  if (profile?.image) {
    return {
      image: profile.image,
      contentType: profile?.contentType,
    };
  }
  return profile || "";
}
