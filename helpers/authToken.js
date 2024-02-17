const jwt = require("jsonwebtoken");
const config = require("../config/db.config");
class AuthToken {
  #secret__attr;
  #refresh__attr;
  #signToken;
  #verifyToken;
  constructor() {
    this.#secret__attr = {
      key: config.jwt_secret_key,
      expiresIn: "1h",
    };
    this.#refresh__attr = {
      key: config.jwt_refresh_secret_key,
      expiresIn: "1d",
    };
    this.#signToken = (payload, isRefreshToken) => {
      const _secret = isRefreshToken ? this.#refresh__attr : this.#secret__attr;
      return jwt.sign(payload, _secret["key"], {
        expiresIn: _secret["expiresIn"],
      });
    };
    this.#verifyToken = (req, res, next, isRefreshToken) => {
      try {
        const origin = req?.headers?.origin?.split("://")?.[1] || "";
        const token = isRefreshToken
          ? req.body.refreshToken
          : req?.cookies?.[`token_${origin}`];
        // const token = authHeader?.split(" ")?.[1];
        if (!token)
          return next({
            status: 400,
            message: "Token Required",
          });
        const _secret = isRefreshToken
          ? this.#refresh__attr
          : this.#secret__attr;
        jwt.verify(token, _secret["key"], (err, payload) => {
          if (err) {
            return next({
              status: 401,
              message: "Request UnAuthorization",
            });
          }
          req.user_id = payload.user_id;
          return next();
        });
      } catch (err) {
        next(err);
      }
    };
  }
  getAccessToken = (payload) => this.#signToken(payload);
  getRefreshToken = (payload) => this.#signToken(payload, true);
  verifyAccessToken = (req, res, next) => this.#verifyToken(req, res, next);
  verifyRefreshToken = (req, res, next) =>
    this.#verifyToken(req, res, next, true);
}

module.exports = new AuthToken();
