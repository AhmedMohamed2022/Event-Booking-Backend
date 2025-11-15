const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  country: {
    type: String,
    enum: ["jordan", "kuwait"],
    default: "jordan",
  },
  serviceType: { type: String }, // optional (e.g., Hall, Decoration...)
  city: { type: String },
  notes: { type: String },
  status: {
    type: String,
    enum: ["pending", "reviewed", "approved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("JoinRequest", joinRequestSchema);
