const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const AdminLog = require("../models/AdminLog");
const Community = require("../models/Community");

const router = express.Router();

//  Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * SIGNUP
 * POST /api/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      lastname,
      email,
      password,
      instrument,
      state,
      city,
    } = req.body;

    // Validate
    if (
      !name ||
      !lastname ||
      !email ||
      !password ||
      !instrument ||
      !state ||
      !city
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      lastname,
      email,
      password: hashedPassword,
      instrument,
      state,
      city,
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        instrument: user.instrument,
        state: user.state,
        city: user.city,
        profilePhoto: user.profilePhoto || "", 
        role: user.role
      },
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN
 * POST /api/login
 */
router.post("/login", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is currently unavailable. Please check backend logs." });
    }
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Activity Logging
    try {
      const isCommunityAdmin = await Community.exists({ admin: user._id });
      const action = isCommunityAdmin ? "COMMUNITY_ADMIN_LOGIN" : "USER_LOGIN";
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      
      await AdminLog.create({
        adminId: user._id, 
        email: user.email,
        action,
        ip,
        userAgent,
        details: `${action}: ${user.email} from ${ip}`,
      });
    } catch (logErr) {
      console.error("Log error (ignoring):", logErr);
    }

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        instrument: user.instrument,
        state: user.state,
        city: user.city,
        profilePhoto: user.profilePhoto || "", 
        role: user.role
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * FORGOT PASSWORD (REAL EMAIL)
 * POST /api/forgot-password
 */
router.post("/forgot-password", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database is currently unavailable. Please check backend logs." });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();

    // Send Real Email
    const mailOptions = {
      from: `"Jam Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Code",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>You requested a password reset. Use the code below to proceed:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">
            ${otp}
          </div>
          <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    console.log(`[EMAIL] Attempting to send OTP to ${user.email}...`);
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent successfully to ${user.email}`);

    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("[EMAIL ERROR] Error sending forgot password email:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * VERIFY OTP
 * POST /api/verify-otp
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    res.json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * RESET PASSWORD (REAL)
 * POST /api/reset-password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code session" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, "SECRET_KEY");
    const user = await User.findById(decoded.id).select("-password");

    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
