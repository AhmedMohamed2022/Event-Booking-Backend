const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  eventItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EventItem",
    required: true,
  },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventDate: { type: Date, required: true },
  numberOfPeople: Number,
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },
  totalPrice: Number,
  paidAmount: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", bookingSchema);
