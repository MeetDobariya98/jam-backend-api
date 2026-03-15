const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// SEND FOLLOW REQUEST OR FOLLOW DIRECTLY
router.post("/follow/:targetId", async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = req.params.targetId;

    if (!isValidObjectId(targetId) || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const currUser = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!currUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Always treat as connection request in this platform
    if (!targetUser.pendingRequests.includes(userId) && !targetUser.connections.includes(userId)) {
      targetUser.pendingRequests.push(userId);
      await targetUser.save();

      // Create notification
      await Notification.create({
        senderId: userId,
        receiverId: targetId,
        message: `${currUser.name} sent you a connection request.`,
        type: "connection_request"
      });

      return res.json({ message: "Connection request sent", status: "requested" });
    }

    return res.status(400).json({ message: "Request already sent or already connected" });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ACCEPT CONNECTION REQUEST
router.post("/accept/:requesterId", async (req, res) => {
  try {
    const { userId } = req.body;
    const requesterId = req.params.requesterId;

    if (!isValidObjectId(requesterId) || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const currUser = await User.findById(userId);
    const requesterUser = await User.findById(requesterId);

    if (!currUser || !requesterUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from pending
    currUser.pendingRequests = currUser.pendingRequests.filter(id => id.toString() !== requesterId);
    
    // Add to connections for both
    if (!currUser.connections.includes(requesterId)) {
      currUser.connections.push(requesterId);
    }
    if (!requesterUser.connections.includes(userId)) {
      requesterUser.connections.push(userId);
    }

    await currUser.save();
    await requesterUser.save();

    // Create notification
    await Notification.create({
      senderId: userId,
      receiverId: requesterId,
      message: `${currUser.name} accepted your connection request.`,
      type: "request_accepted"
    });
    
    // Optionally clear the request notification from the bell
    await Notification.deleteMany({
      senderId: requesterId,
      receiverId: userId,
      type: "connection_request"
    });

    res.json({ message: "Request accepted successfully", status: "connected" });
  } catch (error) {
    console.error("Accept error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// REJECT CONNECTION REQUEST
router.post("/reject/:requesterId", async (req, res) => {
  try {
    const { userId } = req.body;
    const requesterId = req.params.requesterId;

    const currUser = await User.findById(userId);

    if (!currUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove from pending
    currUser.pendingRequests = currUser.pendingRequests.filter(id => id.toString() !== requesterId);
    await currUser.save();
    
    // Delete the notification
    await Notification.deleteMany({
      senderId: requesterId,
      receiverId: userId,
      type: "connection_request"
    });

    res.json({ message: "Request rejected" });
  } catch (error) {
    console.error("Reject error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// REMOVE CONNECTION
router.post("/unfollow/:targetId", async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = req.params.targetId;

    const currUser = await User.findById(userId);
    const targetUser = await User.findById(targetId);

    if (!currUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    currUser.connections = currUser.connections.filter(id => id.toString() !== targetId);
    targetUser.connections = targetUser.connections.filter(id => id.toString() !== userId);
    
    // Also remove from requests if user cancels request
    targetUser.pendingRequests = targetUser.pendingRequests.filter(id => id.toString() !== userId);

    await currUser.save();
    await targetUser.save();

    res.json({ message: "Connection removed successfully", status: "none" });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET CONNECTION STATUS
router.post("/status/:targetId", async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = req.params.targetId;

    const currUser = await User.findById(userId);
    const targetUser = await User.findById(targetId);
    
    if (!currUser || !targetUser) return res.status(404).json({ message: "User not found" });

    if (currUser.connections.includes(targetId)) {
      return res.json({ status: "connected" });
    } else if (targetUser.pendingRequests.includes(userId)) {
      return res.json({ status: "requested" });
    } else {
      return res.json({ status: "none" });
    }
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
