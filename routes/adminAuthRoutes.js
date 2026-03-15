const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminLog = require("../models/AdminLog");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin_super_secret_k3y";

// ─── Admin Login ───────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.role !== "admin")
      return res.status(403).json({ message: "Not an admin account" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Record login activity
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await AdminLog.create({
      adminId: user._id,
      email: user.email,
      action: "LOGIN",
      ip,
      userAgent,
      details: `Admin logged in from ${ip}`,
    });

    const token = jwt.sign(
      { id: user._id, role: "admin" },
      ADMIN_JWT_SECRET,
      { expiresIn: "4h" }
    );

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        profilePhoto: user.profilePhoto || "",
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
