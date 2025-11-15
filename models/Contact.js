const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
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
    eventItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventItem",
      required: true,
    },
    contactDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
