require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const admins = await User.find({ role: 'admin' }).select('name lastname email');
    console.log("=== CURRENT ADMINS ===");
    if (admins.length === 0) {
      console.log("No admins found in the database. You can run 'node setAdmin.js' or 'node makeAdmin.js <email>' to create one.");
    } else {
      admins.forEach(a => {
        console.log(`- ${a.name} ${a.lastname} (${a.email})`);
      });
    }
  } catch(err) {
    console.error("Error querying users:", err);
  } finally {
    process.exit(0);
  }
}).catch(err => {
  console.error("DB Error:", err);
  process.exit(1);
});
