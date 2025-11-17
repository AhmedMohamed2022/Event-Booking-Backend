const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventItem",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// ensure one rating per user per service
ratingSchema.index({ service: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
