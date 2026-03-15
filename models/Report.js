const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true // Can be User, Post, or Community
    },
    reportedType: {
      type: String,
      enum: ["user", "post", "community"],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
