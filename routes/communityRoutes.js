const express = require("express");
const router = express.Router();
const Community = require("../models/Community");
const User = require("../models/User");
const Post = require("../models/Post");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET ALL COMMUNITIES
router.get("/", async (req, res) => {
  try {
    const communities = await Community.find()
      .populate("admin", "name lastname profilePhoto headline")
      .populate("members", "name lastname profilePhoto");
    res.json(communities);
  } catch (err) {
    console.error("Get communities error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE COMMUNITY
router.post("/", async (req, res) => {
  try {
    const { name, description, coverImage, adminId } = req.body;

    if (!name || !description || !adminId) {
      return res.status(400).json({ message: "Name, description, and admin are required." });
    }

    const newCommunity = await Community.create({
      name,
      description,
      coverImage,
      admin: adminId,
      members: [adminId] // Admin is automatically a member
    });

    res.status(201).json(newCommunity);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Community name already exists." });
    console.error("Create community error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// JOIN / LEAVE COMMUNITY
router.put("/:id/join", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const community = await Community.findById(req.params.id);

    if (!community) return res.status(404).json({ message: "Community not found" });

    if (community.members.includes(userId)) {
      // Leave
      if (community.admin.toString() === userId) {
        return res.status(400).json({ message: "Admin cannot leave the community. Assign a new admin first." });
      }
      community.members = community.members.filter(id => id.toString() !== userId);
    } else {
      // Join
      community.members.push(userId);
    }

    await community.save();
    
    const populatedCom = await Community.findById(community._id)
      .populate("admin", "name lastname profilePhoto headline")
      .populate("members", "name lastname profilePhoto headline");
      
    res.json(populatedCom);
  } catch (err) {
    console.error("Join community error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST TO COMMUNITY
router.post("/:id/post", async (req, res) => {
  try {
    const { authorId, content, media } = req.body;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    const community = await Community.findById(req.params.id);

    if (!community) return res.status(404).json({ message: "Community not found" });

    if (!community.members.includes(authorId)) {
      return res.status(403).json({ message: "You must be a member to post in this community." });
    }

    const newPost = await Post.create({
      author: authorId,
      content,
      media: media || [],
      community: req.params.id
    });

    community.posts.push(newPost._id);
    await community.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "name lastname profilePhoto headline");

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Community post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET COMMUNITY POSTS
router.get("/:id/posts", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    
    const posts = await Post.find({ community: req.params.id })
      .sort({ createdAt: -1 })
      .populate("author", "name lastname profilePhoto headline")
      .populate("comments.user", "name lastname profilePhoto");
      
    res.json(posts);
  } catch (err) {
    console.error("Get community posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
