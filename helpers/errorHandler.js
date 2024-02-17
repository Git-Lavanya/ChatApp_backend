module.exports = (error, req, res, next) => {
  // const createError = require("http-errors");
  let message = error.message || "Unknown error occured",
    status = error.status || 500;
  // if (createError.isHttpError(error)) {
  //   message = error.message;
  //   status = error.status;
  // }
  res.status(status).json({ error: { message: message } });
  return;
};
