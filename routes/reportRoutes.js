const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

// Create a report
router.post("/", async (req, res) => {
    try {
        const { reporterId, reportedId, reportedType, reason } = req.body;
        if (!reporterId || !reportedId || !reportedType || !reason) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newReport = new Report({
            reporterId,
            reportedId,
            reportedType,
            reason
        });

        await newReport.save();
        res.status(201).json(newReport);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
