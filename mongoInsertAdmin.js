// // mongoInsertAdmin.js

// require("dotenv").config();
// const mongoose = require("mongoose");
// const User = require("./models/User");

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(async () => {
//     console.log("✅ Connected to MongoDB");

//     const adminPhone = "+201234567890";

//     const existingAdmin = await User.findOne({ phone: adminPhone });
//     if (existingAdmin) {
//       console.log("⚠️ Admin user already exists.");
//       return process.exit(0);
//     }

//     const admin = new User({
//       name: "Super Admin",
//       phone: adminPhone,
//       role: "admin",
//       //   password: "admin", // NOTE: not used since login is OTP-based
//       isLocked: false,
//       bookingCount: 0,
//     });

//     await admin.save();
//     console.log("✅ Admin created:", admin);
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.error("❌ Failed to connect to DB", err);
//     process.exit(1);
//   });
