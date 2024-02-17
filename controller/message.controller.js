const { chat: Chat, users: User, message: Message } = require("../models");
const { requiredParameterValidation } = require("../helpers/common");
exports.sendMessage = (req, res, next) => {
  try {
    const { body } = req;
    const badRequest = requiredParameterValidation(body, [
      "chat_id",
      "content",
    ]);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }
    const newMessage = {
      message: body.chat_id,
      sender: req.user_id,
      content: body.content,
    };
    Message.create(newMessage)
      .then(async (result) => {
        var createdMessage = await Chat.populate(result, [
          {
            path: "sender",
            select: "-password",
          },
          { path: "message" },
        ]);
        createdMessage = await User.populate(createdMessage, {
          path: "message.users",
          select: "-password",
        });
        await Chat.findByIdAndUpdate(body.chat_id, {
          latestMessage: createdMessage,
        });
        res.send({
          status: 200,
          data: createdMessage,
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};

exports.getAllMessage = async (req, res, next) => {
  try {
    const { chat_id } = req.params;
    const { page = 1, page_size } = req.query;
    const badRequest = requiredParameterValidation(req.params, ["chat_id"]);
    if (badRequest) {
      return next({
        status: 400,
        message: `Required fields ${badRequest} are not exist`,
      });
    }

    const messageCount = await Message.countDocuments({ message: chat_id });
    const limit = page_size || messageCount;
    const skip = messageCount - page * page_size;
    Message.find({ message: chat_id })
      .populate("sender", "-password -profile_pic")
      .select("content sender")
      // .sort({ _id: -1 });
      .skip(skip < 0 ? 0 : skip)
      .limit(skip < 0 ? Number(page_size) + skip : limit)
      .then((result) => {
        res.send({
          status: 200,
          data: {
            data: result,
            totalCount: messageCount,
            hasNextPage: !(skip <= 0),
            hasPrevPage: page != 1,
          },
        });
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
};
