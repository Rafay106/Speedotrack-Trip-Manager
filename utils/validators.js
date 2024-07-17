const validator = require("validator");

const isEmailValid = (email) => {
  if (!email) return true;
  else return validator.isEmail(email);
};

module.exports = { isEmailValid };
