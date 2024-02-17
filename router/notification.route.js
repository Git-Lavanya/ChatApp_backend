module.exports = (app, router, verifyAccessToken) => {
  const Notification = require("../controller/notification.controller");
  router.post(
    "/getNotification",
    verifyAccessToken,
    Notification.getNotification
  );
  router.delete(
    "/deleteNotification",
    verifyAccessToken,
    Notification.deleteNotification
  );
  app.use("/api", router);
};
