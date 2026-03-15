const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    lastname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // 🔐 never return password
    },

    instrument: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },
    profilePhoto: {
      type: String,
    },
    
    // --- LinkedIn Style Profile Enhancements ---
    coverPhoto: {
      type: String,
    },
    headline: {
      type: String,
      default: "Musician",
    },
    about: {
      type: String,
      maxLength: 1000,
    },
    bio: {
      type: String,
      maxLength: 160,
    },
    experience: [
      {
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String,
      }
    ],
    education: [
      {
        school: String,
        degree: String,
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
      }
    ],
    skills: [
      {
        type: String
      }
    ],
    portfolio: [
      {
        type: { type: String, enum: ["audio", "video", "link"] },
        url: String,
        title: String,
        description: String
      }
    ],
    // --- Connection/Networking System ---
    connections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    pendingRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // --- Admin / Moderation ---
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordOTPExpires: {
      type: Date,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
