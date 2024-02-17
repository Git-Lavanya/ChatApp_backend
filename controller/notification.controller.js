const { requiredParameterValidation } = require("../helpers/common");
const { notification: Notification } = require("../models");
const mongoose = require("mongoose");
exports.sendNotification = (req, notifyUsers, socket) => {
  try {
    Notification.create({ note: req, notifyUsers })
      .then(() => {
        if (socket)
          req.message.users.forEach((user) =>
            socket.in(user._id).emit("notification alert")
          );
      })
      .catch((err) => console.error(err));
  } catch (err) {
    console.error(err);
  }
};

exports.getNotification = (req, res, next) => {
  try {
    const { body } = req;
    const matchQuery = body.chat_id
      ? {
          notifyUsers: new mongoose.Types.ObjectId(req.user_id),
          "note.message._id": new mongoose.Types.ObjectId(body.chat_id),
        }
      : { notifyUsers: new mongoose.Types.ObjectId(req.user_id) };
    //*********** Nested Pipeline match query and custom response structure ****************/
    Notification.aggregate([
      {
        $lookup: {
          from: "messages",
          localField: "note",
          foreignField: "_id",
          as: "note",
        },
      },
      { $unwind: { path: "$note" } },
      {
        $lookup: {
          from: "chats",
          localField: "note.message",
          foreignField: "_id",
          as: "note.message",
        },
      },
      { $unwind: { path: "$note.message" } },
      {
        $lookup: {
          from: "users",
          localField: "note.sender",
          foreignField: "_id",
          as: "note.sender",
        },
      },
      { $unwind: { path: "$note.sender" } },
      {
        $match: matchQuery,
      },
      //   {
      //     $match: {
      //       "note.message.users": new mongoose.Types.ObjectId(req.user_id),
      //     },
      //   },
      {
        $group: {
          _id: "$note.message._id",
          data: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          "note.message._id": "$_id", // Rename _id to note.message._id
          data: 1, // Keep the grouped data
        },
      },
      {
        $group: {
          _id: null,
          results: {
            $push: { k: { $toString: "$note.message._id" }, v: "$data" }, // Construct the array of objects with key and value
          },
        },
      },
      {
        $project: {
          _id: 0,
          results: { $arrayToObject: "$results" }, // Create the final object
        },
      },
      {
        $project: {
          "results.*.note.sender.profile_pic": 0,
          "results.*.note.message": 0,
        },
      },
    ])
      .then((data) => {
        res.send({
          status: 200,
          data: data[0]?.results,
        });
      })
      .catch((err) => {
        next(err);
      });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = (req, res, next) => {
  try {
    const { body } = req;
    const badRequest = requiredParameterValidation(body, ["chat_id"]);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    Notification.aggregate([
      {
        $lookup: {
          from: "messages",
          localField: "note",
          foreignField: "_id",
          as: "note",
        },
      },
      { $unwind: { path: "$note" } },
      {
        $match: {
          "note.message": new mongoose.Types.ObjectId(body.chat_id),
          notifyUsers: new mongoose.Types.ObjectId(req.user_id),
        },
      },
    ]).then((docs) => {
      if (docs?.length) {
        const collectedDocs = docs.map((doc) => doc._id);
        Notification.updateMany(
          {
            _id: { $in: collectedDocs },
          },
          { $pull: { notifyUsers: new mongoose.Types.ObjectId(req.user_id) } }
        ).then(async (result) => {
          const data = await Notification.deleteMany({
            notifyUsers: { $size: 0 },
          });
          res.send({
            status: 200,
            data: {
              modifiedNotes: result,
              deletedNotes: data,
            },
          });
        });
      } else {
        res.send({
          status: 200,
          data: {
            modifiedNotes: null,
            deletedNotes: null,
          },
        });
      }
    });
  } catch (err) {
    next(err);
  }
};
