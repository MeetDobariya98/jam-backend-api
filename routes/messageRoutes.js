const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// SEND MESSAGE
router.post("/send", async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;

    if (!isValidObjectId(sender) || !isValidObjectId(receiver)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const newMessage = await Message.create({
      sender,
      receiver,
      text
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET CONVERSATIONS LIST
router.get("/conversations/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!isValidObjectId(userId)) return res.status(400).json({ message: "Invalid User ID" });

    // Find all messages involving this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    // Extract unique other users
    const conversationMap = new Map();

    for (const msg of messages) {
      const otherUser = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!conversationMap.has(otherUser)) {
        conversationMap.set(otherUser, {
          lastMessage: msg.text,
          timestamp: msg.createdAt,
          isRead: msg.receiver.toString() === userId ? msg.isRead : true,
          otherUserId: otherUser
        });
      }
    }

    const conversations = Array.from(conversationMap.values());

    // Populate user details
    const populatedConversations = await Promise.all(conversations.map(async (conv) => {
      const userData = await User.findById(conv.otherUserId).select("name lastname profilePhoto headline");
      return { ...conv, user: userData };
    }));

    res.json(populatedConversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET CHAT HISTORY
router.get("/history/:userId/:otherUserId", async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    if (!isValidObjectId(userId) || !isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// MARK MESSAGES AS READ
router.put("/mark-read/:userId/:otherUserId", async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    await Message.updateMany(
      { sender: otherUserId, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
