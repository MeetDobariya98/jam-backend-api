const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      default: "LOGIN",
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    details: {
      type: String, // e.g. "Deleted post XYZ", "Blocked user ABC"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
