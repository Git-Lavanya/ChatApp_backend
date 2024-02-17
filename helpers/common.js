const cryptoJS = require("crypto-js");
const multer = require("multer");
const storage = multer.memoryStorage();
exports.upload = multer({ storage: storage });
exports.encryptPassword = (password) =>
  cryptoJS.AES.encrypt(password, " ").toString();
exports.decryptPassword = (password, type) => {
  const decrypted = cryptoJS.AES.decrypt(password, " ");
  const result = decrypted.toString(cryptoJS.enc.Utf8);
  console.log(result, type, "oooo");
  return result;
};
exports.requiredParameterValidation = (body, fields) => {
  const missingParams = [];
  if (fields) {
    for (let param of fields) {
      [null, undefined, ""].includes(body[param]) && missingParams.push(param);
    }
    return missingParams.length ? missingParams.join(",") : null;
  }
};
