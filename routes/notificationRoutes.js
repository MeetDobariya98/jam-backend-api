const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

/* SEND CONNECTION REQUEST */

router.post("/send-request", async (req, res) => {

  const { senderId, receiverId, message } = req.body;

  try {

    const notification = await Notification.create({
      senderId,
      receiverId,
      message,
      type: "connection_request"
    });

    res.json(notification);

  } catch (error) {

    res.status(500).json({ error: "Error sending request" });

  }

});

/* GET USER NOTIFICATIONS (FOR BELL ICON) */
router.get("/:userId", async (req, res) => {
  try {
    if (!req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }
    const notifications = await Notification.find({
      receiverId: req.params.userId
    })
    .populate("senderId", "name lastname profilePhoto")
    .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notifications" });
  }
});

/* MARK NOTIFICATIONS AS READ */
router.put("/mark-read/:userId", async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.params.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error marking notifications as read" });
  }
});

/* GET SENT REQUESTS (FOR DISCOVER PAGE) */

router.get("/sent/:userId", async (req, res) => {

  try {

    const requests = await Notification.find({
      senderId: req.params.userId,
      type: "connection_request"
    });

    res.json(requests);

  } catch (error) {

    res.status(500).json({ error: "Error fetching sent requests" });

  }

});

module.exports = router;