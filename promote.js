const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address as an argument.");
  console.log("Usage: node promote.js your-email@example.com");
  process.exit(1);
}

async function promote() {
  try {
    console.log(`🔗 Connecting to database...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected.");

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email "${email}" not found in the database.`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();

    console.log(`🚀 SUCCESS: User "${email}" has been promoted to Admin role!`);
    console.log("You can now log in at https://jam-app-nine.vercel.app/jam-admin-x7k");

  } catch (error) {
    console.error("❌ Error promoting user:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

promote();
