require("dotenv").config();

// Connect to db
require("./config/db")();

const express = require("express");
const morgan = require("morgan");
const fs = require("node:fs");
const path = require("node:path");
const UC = require("./utils/common");
const { errorHandler } = require("./middlewares/errorMiddleware");
const { authenticate, authorise } = require("./middlewares/authMiddleware");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const logPath = path.join(__dirname, "logs");
if (!fs.existsSync(logPath)) fs.mkdirSync(logPath, { recursive: true });

const accessLogStream = fs.createWriteStream(
  path.join(logPath, `access_${UC.getYMD()}.log`),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "static")));

app.use("/api", require("./routes/authRoutes"));
app.use("/api/user", authenticate, authorise, require("./routes/userRoutes"));
app.use("/api/trip", authenticate, require("./routes/tripRoutes"));
app.use("/api/util", authenticate, require("./routes/utilRoutes"));

app.use(express.static(path.join(__dirname, "build")));

app.all("/api/*", (req, res) =>
  res.status(404).json({ msg: "Url not found!" })
);

app.get("*", (req, res) =>
  res.sendFile(path.resolve(__dirname, "build", "index.html"))
);

app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
