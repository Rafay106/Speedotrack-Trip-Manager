const { NODE_ENV } = process.env;

const errorHandler = (err, req, res, next) => {
  console.log("Custom Error Handler:", err);

  // if (process.env.NODE_ENV === "development") {
  //   devErrors(res, err);
  // } else if (process.env.NODE_ENV === "production") {
  //   if (err.name === "CastError") err = castErrorHandler(err);
  //   if (err.code === 11000) err = duplicateKeyErrorHandler(err)
  // }

  const errObj = {
    message: err.message || "Something went wrong",
  };

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (err.name === "ValidationError") {
    const message = Object.keys(err.errors).map((key) =>
      err.errors[key].message.replace("%F%", `${key}`)
    );

    errObj.message = message;
    statusCode = 400;
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    const message = Object.keys(err.keyValue).map(
      (key) => `${key}: ${err.keyValue[key]} already exists!`
    );

    errObj.message = message;
    statusCode = 400;
  } else if (err.name === "BulkImportError") {
    errObj.message = err.message.split(",");
    statusCode = 400;
  } else if (err.name === "CustomValidation") {
    statusCode = 400;
  }

  // errObj.stack = NODE_ENV === "production" ? null : err.stack.split("\n");
  errObj.stack = err.stack.split("\n");

  res.status(statusCode).json(errObj);
};

module.exports = { errorHandler };
