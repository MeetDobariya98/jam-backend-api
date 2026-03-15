const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");

// CREATE POST
router.post("/", async (req, res) => {
  try {
    const { authorId, content, media } = req.body;
    
    if (!authorId) {
      return res.status(400).json({ message: "Author is required." });
    }

    if (!content && (!media || media.length === 0)) {
      return res.status(400).json({ message: "Content or media is required." });
    }

    const newPost = await Post.create({
      author: authorId,
      content,
      media: media || []
    });

    const populatedPost = await Post.findById(newPost._id).populate("author", "name lastname profilePhoto headline");
    res.status(201).json(populatedPost);

  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET FEED (All posts, sorted by newest)
// In a real LinkedIn, this would be filtered by connections.
router.get("/feed", async (req, res) => {
  try {
    // Only show posts that are NOT assigned to a community in the main feed
    const posts = await Post.find({ community: null })
      .sort({ createdAt: -1 })
      .populate("author", "name lastname profilePhoto headline")
      .populate("comments.user", "name lastname profilePhoto");
      
    res.json(posts);
  } catch (err) {
    console.error("Get feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET POSTS BY USER ID
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("author", "name lastname profilePhoto headline")
      .populate("comments.user", "name lastname profilePhoto");
    res.json(posts);
  } catch (err) {
    console.error("Get user posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LIKE / UNLIKE POST
router.put("/:id/like", async (req, res) => {
  try {
    const { userId } = req.body; // In production, get from JWT
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ADD COMMENT
router.post("/:id/comment", async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!userId || !text) {
      return res.status(400).json({ message: "User and text are required." });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({ user: userId, text });
    await post.save();
    
    const populatedPost = await Post.findById(post._id)
      .populate("author", "name lastname profilePhoto headline")
      .populate("comments.user", "name lastname profilePhoto");

    res.json(populatedPost);
  } catch (err) {
    console.error("Comment post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE POST
router.delete("/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check ownership (author field contains user ID)
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
