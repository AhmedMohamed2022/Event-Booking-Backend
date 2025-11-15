const mongoose = require("mongoose");

const contactRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventItem",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // origin of the contact request (e.g. 'instagram', 'facebook', 'direct')
    via: {
      type: String,
    },
    // Optional quoted price provided by supplier in response to the contact request
    quotedPrice: {
      amount: { type: Number },
      currency: { type: String },
      priceType: { type: String },
    },
    // If the requester converted this contact request into a booking
    convertedToBooking: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactRequest", contactRequestSchema);
