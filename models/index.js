const mongoose = require("mongoose");
const models = {},
  Schema = mongoose.Schema;
models.mongoose = mongoose;
models.Schema = Schema;
const schemaInstance = (...schema) => {
  return new Schema(...schema);
};

models.users = require("./user.model")(schemaInstance, mongoose);
models.chat = require("./chat.model")(schemaInstance, mongoose);
models.message = require("./message.model")(schemaInstance, mongoose);
models.notification = require("./notification.model")(schemaInstance, mongoose);
module.exports = models;
