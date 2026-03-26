const mongoose = require("mongoose");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Please paste your MongoDB Atlas Connection String: ", async (uri) => {
  try {
    console.log("\n⏳ Attempting to connect to Atlas...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ SUCCESS: Successfully connected to MongoDB Atlas!");
    console.log("This means your current IP is whitelisted and the URI is correct.");
  } catch (err) {
    console.error("\n❌ CONNECTION FAILED!");
    console.error("Reason:", err.message);
    console.log("\nSolution: Ensure you have added 0.0.0.0/0 to 'Network Access' in MongoDB Atlas.");
  } finally {
    mongoose.connection.close();
    rl.close();
  }
});
