const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const user = await User.findOne({ email: "a112@gmail.com" });
        if (user) {
            user.role = "admin";
            await user.save();
            console.log(`User ${user.email} is now an ADMIN.`);
        } else {
            console.log("User not found to promote.");
        }
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
