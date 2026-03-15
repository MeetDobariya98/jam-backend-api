const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  message: {
    type: String
  },

  type: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);