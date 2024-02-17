module.exports = (app, router, verifyRefreshToken, verifyAccessToken) => {
  const User = require("../controller/user.controller");
  const multer = require("multer");
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });
  // const { upload } = require("../helpers/common");
  router.post("/auth/login", User.login);
  router.post("/auth/refreshToken", verifyRefreshToken, User.refreshToken);
  router.post("/createUser", User.createUser);
  router.post("/getUser", verifyAccessToken, User.getUser);
  router.patch("/updateUser", verifyAccessToken, upload.any(), User.updateUser);
  app.use("/api", router);
};
