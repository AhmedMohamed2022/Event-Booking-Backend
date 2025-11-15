const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    paymentId: String,
    amount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
