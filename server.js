const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean).map(url => url.replace(/\/$/, ""));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`[CORS REJECTED] Origin: ${origin}`);
      return callback(new Error("CORS Not Allowed"), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

//  Routes
app.use("/api", require("./routes/auth"));

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

const postRoutes = require("./routes/postRoutes");
app.use("/api/posts", postRoutes);

const connectionRoutes = require("./routes/connectionRoutes");
app.use("/api/connections", connectionRoutes);

const communityRoutes = require("./routes/communityRoutes");
app.use("/api/communities", communityRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const messageRoutes = require("./routes/messageRoutes");
app.use("/api/messages", messageRoutes);

const adminAuthRoutes = require("./routes/adminAuthRoutes");
app.use("/api/admin-auth", adminAuthRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

//  MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    env: {
      hasMongo: !!process.env.MONGO_URI,
      hasJwt: !!process.env.JWT_SECRET,
      hasFrontend: !!process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

//  404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//  Server Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
