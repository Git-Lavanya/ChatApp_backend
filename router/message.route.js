module.exports = (app, router, verifyAccessToken) => {
  const Message = require("../controller/message.controller");
  router.post("/sendMessage", verifyAccessToken, Message.sendMessage);
  router.get("/:chat_id", verifyAccessToken, Message.getAllMessage);
  app.use("/api/message", router);
};
