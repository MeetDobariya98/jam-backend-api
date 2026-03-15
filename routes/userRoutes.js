const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET ALL USERS (for discover/network)
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET USER BY ID (Full Profile)
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("connections", "name lastname profilePhoto headline")
      .populate("pendingRequests", "name lastname profilePhoto headline");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE USER PROFILE
router.put("/:id", async (req, res) => {
  try {
    // In production, verify JWT matches req.params.id
    const updates = req.body;
    
    // Don't allow password updates here
    delete updates.password;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE USER PROFILE
router.put("/update-profile/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const updates = req.body;
    // Specifically allow these fields
    const allowedUpdates = ["name", "lastname", "headline", "bio", "about", "profilePhoto", "coverPhoto"];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: filteredUpdates },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
