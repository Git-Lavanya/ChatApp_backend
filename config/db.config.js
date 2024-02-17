const dotenv = require("dotenv");
// const path = require("path");
dotenv.config({
  path: `./.env.${process.env.NODE_ENV}`,
});

module.exports = {
  username: process.env.NODE_ENV === "production" ? process.env.USER : "",
  password: process.env.NODE_ENV === "production" ? process.env.PASSWORD : "",
  dbName: "Newbase",
  host: process.env.HOST,
  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  token_expiry: process.env.TOKEN_EXPIRY,
  jwt_secret_key: process.env.JWT_SECRET_KEY,
  jwt_refresh_secret_key: process.env.JWT_REFRESH_SECRET_KEY,
};
