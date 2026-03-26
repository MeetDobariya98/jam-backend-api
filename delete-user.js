const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address as an argument.");
  console.log("Usage: node delete-user.js your-email@example.com");
  process.exit(1);
}

async function remove() {
  try {
    console.log(`🔗 Connecting to database...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected.");

    const result = await User.deleteOne({ email: email.toLowerCase() });

    if (result.deletedCount === 0) {
      console.error(`❌ User with email "${email}" not found.`);
    } else {
      console.log(`🗑️ SUCCESS: User "${email}" has been deleted from the database.`);
    }

  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

remove();
