/*
 Simple migration script to convert legacy `subcategory` (string) into `subcategories` (string[])
 Usage: node scripts/migrate-subcategories.js
 Make sure MONGO_URI is available in environment or in config.
*/

const mongoose = require("mongoose");
const EventItem = require("../models/EventItem");
const config = require("../config/config");

async function run() {
  try {
    const uri =
      process.env.MONGO_URI ||
      config.databaseUrl ||
      "mongodb://localhost:27017/eventbooking";
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");

    const cursor = EventItem.find({
      subcategory: { $exists: true, $ne: null },
    }).cursor();
    let count = 0;

    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      if (!Array.isArray(doc.subcategories) || doc.subcategories.length === 0) {
        const sub = doc.subcategory;
        if (sub && typeof sub === "string") {
          doc.subcategories = [sub];
          await doc.save();
          count++;
          if (count % 100 === 0) console.log(`Migrated ${count} documents...`);
        }
      }
    }

    console.log(`Migration complete. Updated ${count} documents.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
