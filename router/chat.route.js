module.exports = (app, router, verifyAccessToken) => {
  const Chat = require("../controller/chat.controller");
  router.post("/getChat", verifyAccessToken, Chat.getChat);
  router.get("/getAllChats", verifyAccessToken, Chat.getAllChats);
  router.post("/createGroupChat", verifyAccessToken, Chat.createGroupChat);
  router.put("/renameGroup", verifyAccessToken, Chat.renameGroup);
  router.put(
    "/groupMemberPrivilege",
    verifyAccessToken,
    Chat.groupMemberPrivilege
  );
  router.get("/findChat", verifyAccessToken, Chat.findChat);
  router.delete("/deleteChat", verifyAccessToken, Chat.deleteChat);
  app.use("/api/chat", router);
};
