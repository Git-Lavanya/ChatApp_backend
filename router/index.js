const {
  verifyAccessToken,
  verifyRefreshToken,
} = require("../helpers/authToken");
module.exports = (app, router) => {
  require("./user.route")(app, router, verifyRefreshToken, verifyAccessToken);
  require("./chat.route")(app, router, verifyAccessToken);
  require("./message.route")(app, router, verifyAccessToken);
  require("./notification.route")(app, router, verifyAccessToken);
};
