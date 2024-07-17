const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert");
// const xlsx = require("xlsx");

const C = require("../constants");
const Role = require("../models/roleModel");

const createSearchQuery = (fields, value) => {
  const orArr = [];

  for (const field of fields) {
    orArr.push({
      [field]: { $regex: value, $options: "i" },
    });
  }

  return orArr;
};

const paginatedArrayQuery = (
  array,
  page,
  limit,
  sortFn = false,
  queryFn = false,
  selectFn = false
) => {
  const filteredArray = queryFn ? array.filter(queryFn) : array;

  const total = filteredArray.length;
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages) return false;

  const startIdx = (page - 1) * limit;

  let paginatedResults = filteredArray.slice(startIdx, startIdx + limit);

  if (selectFn) paginatedResults = paginatedResults.map(selectFn);

  if (sortFn) paginatedResults = paginatedResults.sort(sortFn);

  const results = {
    total,
    pages,
    page,
    result: paginatedResults,
  };

  return results;
};

const paginatedQuery = async (
  Model,
  query,
  select,
  page,
  limit,
  sort,
  populate = ["", ""]
) => {
  const total = await Model.countDocuments(query);
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages) return false;

  const startIdx = (page - 1) * limit;
  const results = { total, pages, page, result: [] };

  results.result = await Model.find(query)
    .select(select)
    .skip(startIdx)
    .limit(limit)
    .populate(populate[0], populate[1])
    .sort(sort)
    .lean();

  return results;
};

const paginatedQueryProPlus = async (
  Model,
  query,
  select,
  page,
  limit,
  sort,
  populateConfigs = []
) => {
  const total = await Model.countDocuments(query);
  const pages = Math.ceil(total / limit) || 1;
  if (page > pages) return false;

  const startIdx = (page - 1) * limit;
  const results = { total, pages, page, result: [] };

  let mongoQuery = Model.find(query).select(select).skip(startIdx).limit(limit);

  populateConfigs.forEach((config) => {
    mongoQuery = mongoQuery.populate(config);
  });

  results.result = await mongoQuery.sort(sort).lean();

  return results;
};

const excelToJson = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  return data;
};

const jsonToExcel = (filePath, data) => {
  const workbook = xlsx.utils.book_new();

  const worksheet = xlsx.utils.json_to_sheet(data);

  xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  xlsx.writeFile(workbook, filePath);

  return true;
};

// ************************
// ROLE FUNCTIONS START
// ************************

const getRoleId = async (title) => {
  assert(title !== undefined, C.getFieldIsReq("title"));

  const role = await Role.findOne({ title }).select("title").lean();

  if (!role) return false;

  return role._id;
};

// ************************
// ROLE FUNCTIONS END
// ************************

const throwCustomValidationErr = (msg) => {
  const e = new Error(msg);
  e.name = C.CUSTOMVALIDATION;
  throw e;
};

// ************************
// DATE FUNCTIONS START
// ************************

const getYMD = (dt = new Date()) => {
  const now = new Date(dt);

  if (now.getTime() === 0) return "NA";

  const Y = String(now.getUTCFullYear()).padStart(2, "0");
  const M = String(now.getUTCMonth() + 1).padStart(2, "0");
  const D = String(now.getUTCDate()).padStart(2, "0");

  return Y + M + D;
};

const getDDMMYYYY = (dt = new Date()) => {
  const now = new Date(dt.toISOString().replace("Z", "-05:30"));

  if (now.getTime() === 0) return "NA";

  const Y = String(now.getUTCFullYear()).padStart(2, "0");
  const M = String(now.getUTCMonth() + 1).padStart(2, "0");
  const D = String(now.getUTCDate()).padStart(2, "0");

  return `${D}-${M}-${Y}`;
};

const getDDMMYYYYwithTime = (dt = new Date()) => {
  const now = new Date(dt.toISOString().replace("Z", "-05:30"));

  if (now.getTime() === 0) return "NA";

  const Y = String(now.getUTCFullYear()).padStart(2, "0");
  const M = String(now.getUTCMonth() + 1).padStart(2, "0");
  const D = String(now.getUTCDate()).padStart(2, "0");
  const h_ = now.getUTCHours();
  const h = String(h_ > 12 ? h_ - 12 : h_).padStart(2, "0");
  const m = String(now.getUTCMinutes()).padStart(2, "0");
  const s = String(now.getUTCSeconds()).padStart(2, "0");
  const postFix = h_ > 11 ? "PM" : "AM";

  return `${D}-${M}-${Y} ${h}:${m}:${s} ${postFix}`;
};

const daysBetween = (startDate, endDate) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMilliseconds = Math.abs(end - start);
  const diffDays = Math.round(diffMilliseconds / oneDay);
  return diffDays;
};

/**
 * Converts a UTC 0 date to UTC +05:30.
 * Eg: 2024-01-02T03:04:05Z => 2024-01-02T08:34:05Z
 * @param {String|Date} date - valid javascript date string in utc 0 or Date object
 * @returns ISO String of date with +05:30 adjusted
 */
const convUTCTo0530 = (date) => {
  const currDt = new Date(date);

  if (isNaN(currDt)) return "NA";

  const dt = new Date(currDt.toISOString().replace("Z", "-05:30"));

  return dt.toISOString();
};

/**
 * Formats a date string into "DD MMM YYYY HH:MM:SS AM/PM" format.
 * Eg: 2024-01-02T03:04:05Z => 02 Jan 2024 03:04:05 AM
 *
 * @param {string|Date} dateTime - The date and time to format. This can be a date string or a Date object.
 * @returns {string} The formatted date string. Returns "NA" if the date is invalid.
 */
const formatDateTimeToAMPM = (dateTime) => {
  const dt = new Date(dateTime);

  if (dt.getTime() === 0) return "NA";

  const Y = String(dt.getUTCFullYear()).padStart(2, "0");
  // const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const M = new Date(dateTime).toLocaleString("default", {
    month: "short",
  });
  const D = String(dt.getUTCDate()).padStart(2, "0");
  const h_ = dt.getUTCHours();
  const h = String(h_ > 12 ? h_ - 12 : h_).padStart(2, "0");
  const m = String(dt.getUTCMinutes()).padStart(2, "0");
  const s = String(dt.getUTCSeconds()).padStart(2, "0");
  const postFix = h_ > 11 ? "PM" : "AM";

  return `${D}-${M}-${Y.slice(2, 4)} ${h}:${m}:${s} ${postFix}`;
};

/**
 * Formats a date string into "DD MMM YYYY HH:MM:SS AM/PM" format.
 * Eg: 2024-01-02T03:04:05Z => 02 Jan 2024
 *
 * @param {string|Date} dateTime - The date and time to format. This can be a date string or a Date object.
 * @returns {string} The formatted date string. Returns "NA" if the date is invalid.
 */
const formatDate = (dateTime) => {
  const dt = new Date(dateTime);

  if (dt.getTime() === 0) return "NA";

  const Y = String(dt.getUTCFullYear()).padStart(2, "0");
  const M = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const D = String(dt.getUTCDate()).padStart(2, "0");

  const monthName = new Date(dateTime).toLocaleString("default", {
    month: "short",
  });

  return `${D} ${monthName} ${Y}`;
};

/**
 * Converts and Formats a date string into "DD MMM YYYY" format.
 * Eg: 2024-01-02T03:04:05Z => 02 Jan 2024 08:34:05 AM
 *
 * @param {string|Date} dateTime - The date and time to format. This can be a date string or a Date object.
 * @returns {string} The formatted date string. Returns "NA" if the date is invalid.
 */
const convAndFormatDT = (dateTime) => {
  return formatDateTimeToAMPM(convUTCTo0530(dateTime));
};

/**
 *
 * @param {Integer|String} excelDate - Number of days from 1900-01-01 or a valid Date string
 * @returns adjusted JavaScript Date with Excel's 1900 leap year-bug
 */
const excelDateToJSDate = (excelDate) => {
  if (typeof excelDate === "string") {
    const date = new Date(excelDate);

    if (isNaN(date)) throw new Error(`Invalid excelDate: ${excelDate}`);

    return date;
  }

  // Unix epoch starts on 1970-01-01, and Excel epoch starts on 1900-01-01
  const excelEpochStart = new Date(Date.UTC(1900, 0, 1));
  const dateOffset = excelDate - 2; // Adjust for Excel's 1900 leap year bug
  const jsDate = new Date(excelEpochStart.getTime() + dateOffset * 86400000); // Convert days to milliseconds
  return jsDate;
};

const getDatesArrayFromDateRange = (start, end) => {
  const dates = [];

  let dt = new Date(start);

  while (dt < end) {
    dates.push(new Date(dt));
    dt = new Date(dt.setUTCDate(dt.getUTCDate() + 1));
  }

  return dates;
};

const getMonthAndYear = (date = new Date()) => {
  const year = date.getUTCFullYear();

  if (date.getUTCMonth() === 0) return `JAN ${year}`;
  else if (date.getUTCMonth() === 1) return `FEB ${year}`;
  else if (date.getUTCMonth() === 2) return `MAR ${year}`;
  else if (date.getUTCMonth() === 3) return `APR ${year}`;
  else if (date.getUTCMonth() === 4) return `MAY ${year}`;
  else if (date.getUTCMonth() === 5) return `JUN ${year}`;
  else if (date.getUTCMonth() === 6) return `JUL ${year}`;
  else if (date.getUTCMonth() === 7) return `AUG ${year}`;
  else if (date.getUTCMonth() === 8) return `SEP ${year}`;
  else if (date.getUTCMonth() === 9) return `OCT ${year}`;
  else if (date.getUTCMonth() === 10) return `NOV ${year}`;
  else if (date.getUTCMonth() === 11) return `DEC ${year}`;
};

/**
 *
 * @param {Date|String} date1 Valid Date or Date String
 * @param {Date|String} date2 Valid Date or Date String
 * @returns Absolute difference between them in x D, y H, z M format
 */
const getDiffBetweenDates = (date1, date2) => {
  date1 = new Date(date1);
  if (isNaN(date1)) throw new Error(C.getFieldIsInvalid("date1"));

  date2 = new Date(date2);
  if (isNaN(date2)) throw new Error(C.getFieldIsInvalid("date2"));

  return Math.abs(date1.getTime() - date2.getTime());
};

/**
 *
 * @param {Integer} ms - milliseconds
 * @returns string: x D, y M, z H
 */
const getTimeDetails = (ms) => {
  ms = parseInt(ms);

  if (isNaN(ms)) throw new Error(`ms should be a valid number`);

  let s, Min, H, D;
  let result = "";

  s = Min = H = D = null;

  if (ms >= 1000) s = ms / 1000;
  else result = "0 s";

  if (ms >= 60000) {
    s = s % 60;
    Min = ms / 1000 / 60;
  }

  if (ms >= 3600000) {
    Min = Min % 60;
    H = ms / 1000 / 60 / 60;
  }

  if (ms >= 86400000) {
    H = (ms / 1000 / 60 / 60) % 24;
    D = ms / 1000 / 60 / 60 / 24;
  }

  if (D) result += `${Math.floor(D)} D`;

  if (H) {
    if (D) result += `, ${Math.floor(H)} H`;
    else result = `${Math.floor(H)} H`;
  }

  if (Min) {
    if (H) result += `, ${Math.floor(Min)} Min`;
    else result = `${Math.floor(Min)} Min`;
  }

  if (s) {
    if (Min) result += ` and ${Math.floor(s)} s`;
    else result = `${Math.floor(s)} s`;
  }

  return result;
};

// ************************
// DATE FUNCTIONS END
// ************************

// ************************
// MATHS FUNCTIONS START
// ************************

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

const rad2deg = (rad) => {
  return rad * (180 / Math.PI);
};

const getAngle = (lat1, lng1, lat2, lng2) => {
  const dLng = deg2rad(lng2) - deg2rad(lng1);
  const y = Math.sin(dLng) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLng);
  const angle = (rad2deg(Math.atan2(y, x)) + 360) % 360;

  return Math.floor(angle);
};

const getLenBtwPointsInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const isPointInCircle = (lat1, lon1, lat2, lon2, radius) => {
  const distance = getLenBtwPointsInKm(lat1, lon1, lat2, lon2) * 1000;
  return distance <= radius;
};

const isPointInPolygon = (vertices, lat, lng) => {
  const polyLng = vertices.map((vertex) => vertex.lng);
  const polyLat = vertices.map((vertex) => vertex.lat);

  // vertices = vertices.split(",");
  // vertices = vertices.map((vertex) => parseFloat(vertex));

  // check for all X and Y
  // if (vertices.length % 2 !== 0) vertices.pop();

  let polyVertices = polyLat.length;
  // let i = 0;

  // while (i < vertices.length) {
  //   polyLat.push(vertices[i]);
  //   polyLng.push(vertices[i + 1]);

  //   i += 2;
  //   polyVertices++;
  // }

  let j = polyVertices - 1;
  let oddNodes = false;

  for (let i = 0; i < polyVertices; i++) {
    if (
      (polyLat[i] < lat && polyLat[j] >= lat) ||
      (polyLat[j] < lat && polyLat[i] >= lat)
    ) {
      if (
        polyLng[i] +
          ((lat - polyLat[i]) / (polyLat[j] - polyLat[i])) *
            (polyLng[j] - polyLng[i]) <
        lng
      ) {
        oddNodes = !oddNodes;
      }
    }

    j = i;
  }

  return oddNodes;
};

// ************************
// MATHS FUNCTIONS END
// ************************

// ************************
// MISC FUNCTIONS START
// ************************

const getAppRootDir = (currentDir) => {
  while (!fs.existsSync(path.join(currentDir, "package.json"))) {
    currentDir = path.join(currentDir, "..");
  }

  return currentDir;
};

const writeLog = (name, data) => {
  const logDir = path.join(getAppRootDir(__dirname), "logs", name);

  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, `${name}_${getYMD()}.log`);

  let str = `[${new Date().toISOString().replace("T", " ").split(".")[0]}] `;

  str += "=> " + data + "\n";

  try {
    fs.appendFileSync(logFile, str);
  } catch (err) {
    console.log(err);
  }
};

const replaceEmailSymbols = (email) => {
  return email.replace(/[!#$%&'*+/=?^_`{|}~.-]/g, "_");
};

// ************************
// MISC FUNCTIONS END
// ************************

module.exports = {
  createSearchQuery,
  paginatedArrayQuery,
  paginatedQuery,
  paginatedQueryProPlus,
  excelToJson,
  jsonToExcel,

  getRoleId,

  throwCustomValidationErr,

  getYMD,
  getDDMMYYYY,
  getDDMMYYYYwithTime,
  daysBetween,
  convUTCTo0530,
  formatDateTimeToAMPM,
  formatDate,
  convAndFormatDT,
  excelDateToJSDate,
  getDatesArrayFromDateRange,
  getMonthAndYear,
  getDiffBetweenDates,
  getTimeDetails,

  getAngle,
  getLenBtwPointsInKm,
  isPointInCircle,
  isPointInPolygon,

  getAppRootDir,
  writeLog,
  replaceEmailSymbols,
};
