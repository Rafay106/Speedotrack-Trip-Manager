const path = require("node:path");

const uploadPaths = {
  bus_staff: path.join("static", "uploads", "bus_staff"),
  bulk_import: path.join("data", "bulk_imports"),
  homework: path.join("static", "uploads", "homework"),
  lesson_plan: path.join("static", "uploads", "lesson_plan"),
  notice: path.join("static", "uploads", "notice"),
  student: path.join("static", "uploads", "student"),
  staff: path.join("static", "uploads", "staff"),
  leave_apply: path.join("static","uploads","leave_apply")
};

module.exports = uploadPaths;
