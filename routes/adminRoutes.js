const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Community = require("../models/Community");
const Report = require("../models/Report");
const AdminLog = require("../models/AdminLog");
const ExcelJS = require("exceljs");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin_super_secret_k3y";

// ─── Admin JWT Middleware ──────────────────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Admin access required" });

    req.adminId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Helper to get start of today
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to log admin action
const logAction = async (adminId, email, action, details, req) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    await AdminLog.create({ adminId, email, action, ip, userAgent, details });
  } catch (_) {}
};

// ─── STATS ─────────────────────────────────────────────────────────────────────
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const today = startOfToday();

    const [
      totalUsers,
      usersToday,
      totalPosts,
      postsToday,
      totalCommunities,
      pendingReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Post.countDocuments(),
      Post.countDocuments({ createdAt: { $gte: today } }),
      Community.countDocuments(),
      Report.countDocuments({ status: "pending" }),
    ]);

    // 7-day chart data
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayUsers, dayPosts] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
        Post.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
      ]);

      chartData.push({
        date: dayStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        users: dayUsers,
        posts: dayPosts,
      });
    }

    // Instrument breakdown
    const instrumentStats = await User.aggregate([
      { $group: { _id: "$instrument", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totalUsers,
      usersToday,
      totalPosts,
      postsToday,
      totalCommunities,
      pendingReports,
      chartData,
      instrumentStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DOWNLOAD USER LOGINS - EXCEL ─────────────────────────────────────────────
router.get("/users/download/excel", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    let userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      userQuery.createdAt = {};
      if (startDate) userQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        userQuery.createdAt.$lte = e;
      }
    }
    const users = await User.find(userQuery).select("-password").sort({ createdAt: -1 });
    const loginLogs = await AdminLog.find({ action: { $in: ["USER_LOGIN", "COMMUNITY_ADMIN_LOGIN"] } }).sort({ createdAt: -1 });
    const loginMap = {};
    loginLogs.forEach((log) => { if (!loginMap[log.email]) loginMap[log.email] = log; });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("User Login Data");
    worksheet.columns = [
      { header: "Full Name",     key: "name",       width: 25 },
      { header: "Email",         key: "email",      width: 30 },
      { header: "Instrument",    key: "instrument", width: 20 },
      { header: "Location",      key: "location",   width: 25 },
      { header: "Role",          key: "role",       width: 15 },
      { header: "Status",        key: "status",     width: 12 },
      { header: "Joined",        key: "joined",     width: 20 },
      { header: "Last Login",    key: "lastLogin",  width: 25 },
      { header: "Login Type",    key: "loginType",  width: 25 },
      { header: "Last Login IP", key: "ip",         width: 20 },
    ];
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    users.forEach((u) => {
      const log = loginMap[u.email];
      worksheet.addRow({
        name:       `${u.name} ${u.lastname}`,
        email:      u.email,
        instrument: u.instrument,
        location:   `${u.city}, ${u.state}`,
        role:       u.role,
        status:     u.isBlocked ? "Blocked" : "Active",
        joined:     new Date(u.createdAt).toLocaleDateString("en-IN"),
        lastLogin:  log ? log.createdAt.toLocaleString("en-IN") : "Never",
        loginType:  log ? log.action : "—",
        ip:         log ? log.ip : "—",
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=UserLoginData_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/users/:id/block", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isBlocked = !user.isBlocked;
    await user.save();

    const admin = await User.findById(req.adminId);
    await logAction(
      req.adminId,
      admin?.email,
      user.isBlocked ? "BLOCK_USER" : "UNBLOCK_USER",
      `${user.isBlocked ? "Blocked" : "Unblocked"} user: ${user.email}`,
      req
    );

    res.json({ message: `User ${user.isBlocked ? "blocked" : "unblocked"}`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const admin = await User.findById(req.adminId);
    await logAction(req.adminId, admin?.email, "DELETE_USER", `Deleted user: ${user.email}`, req);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST MANAGEMENT ──────────────────────────────────────────────────────────
router.get("/posts", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, search, author } = req.query;
    let query = {};
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      query.author = author;
    }
    if (search) query.$or = [
      { content: { $regex: search, $options: "i" } }
    ];
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const posts = await Post.find(query)
      .populate("author", "name email profilePhoto")
      .populate("community", "name")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/posts/:id", verifyAdmin, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const admin = await User.findById(req.adminId);
    await logAction(req.adminId, admin?.email, "DELETE_POST", `Deleted post ID: ${req.params.id}`, req);

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMMUNITY MANAGEMENT ─────────────────────────────────────────────────────
router.get("/communities", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    let query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const communities = await Community.find(query)
      .populate("admin", "name email")
      .sort({ createdAt: -1 });
    res.json(communities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/communities/:id", verifyAdmin, async (req, res) => {
  try {
    const community = await Community.findByIdAndDelete(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    const admin = await User.findById(req.adminId);
    await logAction(
      req.adminId,
      admin?.email,
      "DELETE_COMMUNITY",
      `Deleted community: ${community.name}`,
      req
    );

    res.json({ message: "Community deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
router.get("/reports", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const reports = await Report.find(query)
      .populate("reporterId", "name email profilePhoto")
      .sort({ status: 1, createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/reports/:id/resolve", verifyAdmin, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: "Report not found" });

    const admin = await User.findById(req.adminId);
    await logAction(req.adminId, admin?.email, "RESOLVE_REPORT", `Resolved report ID: ${req.params.id}`, req);

    res.json({ message: "Report resolved", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
router.get("/activity", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action } = req.query;
    let query = {};
    if (action && action !== 'all') query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.createdAt.$lte = e; }
    }
    const logs = await AdminLog.find(query)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DOWNLOAD EXCEL ───────────────────────────────────────────────────────────
router.get("/activity/download/excel", verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, action } = req.query;
    let query = {};
    if (action && action !== "all") query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.createdAt.$lte = e;
      }
    }

    const logs = await AdminLog.find(query).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Activity Logs");

    worksheet.columns = [
      { header: "Time", key: "time", width: 25 },
      { header: "Action", key: "action", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Details", key: "details", width: 50 },
      { header: "IP Address", key: "ip", width: 20 },
      { header: "User Agent", key: "userAgent", width: 40 },
    ];

    logs.forEach((log) => {
      worksheet.addRow({
        time: log.createdAt.toLocaleString("en-IN"),
        action: log.action,
        email: log.email,
        details: log.details,
        ip: log.ip,
        userAgent: log.userAgent,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + `ActivityLogs_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
