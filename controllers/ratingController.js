const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const EventItem = require("../models/EventItem");
const Booking = require("../models/Booking");
const ContactRequest = require("../models/ContactRequest");

// Helper: check if user eligible to rate
async function isUserEligibleToRate(userId, serviceId) {
  // confirmed booking
  const hasBooking = await Booking.exists({
    eventItem: serviceId,
    client: userId,
    status: "confirmed",
  });

  if (hasBooking) return true;

  // accepted contact request or convertedToBooking
  const hasContact = await ContactRequest.exists({
    service: serviceId,
    client: userId,
    $or: [{ status: "accepted" }, { convertedToBooking: true }],
  });

  return !!hasContact;
}

// Create or update rating (upsert)
exports.createOrUpdateRating = async (req, res) => {
  try {
    const user = req.user;
    const serviceId = req.params.id;
    const { score, comment } = req.body;

    if (!user)
      return res.status(401).json({ message: "Authentication required" });

    // Validate score
    const n = Number(score);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return res
        .status(400)
        .json({ message: "Score must be integer between 1 and 5" });
    }

    // Eligibility
    const eligible = await isUserEligibleToRate(user._id, serviceId);
    if (!eligible) {
      return res
        .status(403)
        .json({
          message:
            "Only clients who've booked or had an accepted contact request can rate this service.",
        });
    }

    // Upsert rating
    const filter = { service: serviceId, user: user._id };
    const update = {
      score: n,
      comment: comment ? String(comment).trim().slice(0, 1000) : "",
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    // Use findOneAndUpdate to upsert
    const rating = await Rating.findOneAndUpdate(
      filter,
      update,
      options
    ).lean();

    // Recalculate aggregates
    const agg = await Rating.aggregate([
      { $match: { service: new mongoose.Types.ObjectId(serviceId) } },
      {
        $group: {
          _id: "$service",
          avg: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = agg && agg.length ? agg[0] : { avg: 0, count: 0 };

    await EventItem.findByIdAndUpdate(serviceId, {
      averageRating: summary.avg || 0,
      ratingCount: summary.count || 0,
    });

    return res.json({
      rating,
      averageRating: summary.avg || 0,
      ratingCount: summary.count || 0,
    });
  } catch (err) {
    console.error("createOrUpdateRating error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get ratings list for a service (paginated)
exports.getRatings = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);

    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ service: serviceId })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Rating.countDocuments({ service: serviceId });

    return res.json({ data: ratings, page, limit, total });
  } catch (err) {
    console.error("getRatings error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// A convenience endpoint that returns ratings under `ratings` key (consistent shape)
exports.getRatingsList = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ service: serviceId })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Rating.countDocuments({ service: serviceId });

    return res.json({ ratings, page, limit, total });
  } catch (err) {
    console.error("getRatingsList error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get rating summary (avg + count)
exports.getSummary = async (req, res) => {
  try {
    const serviceId = req.params.id;

    // Try to read from EventItem denormalized fields first
    const item = await EventItem.findById(serviceId)
      .select("averageRating ratingCount")
      .lean();
    if (item) {
      return res.json({
        averageRating: item.averageRating || 0,
        ratingCount: item.ratingCount || 0,
      });
    }

    // Fallback to aggregation
    const agg = await Rating.aggregate([
      { $match: { service: mongoose.Types.ObjectId(serviceId) } },
      {
        $group: {
          _id: "$service",
          avg: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = agg && agg.length ? agg[0] : { avg: 0, count: 0 };
    return res.json({
      averageRating: summary.avg || 0,
      ratingCount: summary.count || 0,
    });
  } catch (err) {
    console.error("getSummary error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Check if current user is eligible to rate this service
exports.checkEligibility = async (req, res) => {
  try {
    const user = req.user;
    const serviceId = req.params.id;

    if (!user) return res.json({ eligible: false });

    const eligible = await isUserEligibleToRate(user._id, serviceId);
    return res.json({ eligible });
  } catch (err) {
    console.error("checkEligibility error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get current user's rating for this service
exports.getMyRating = async (req, res) => {
  try {
    const user = req.user;
    const serviceId = req.params.id;

    if (!user)
      return res.status(401).json({ message: "Authentication required" });

    const my = await Rating.findOne({
      service: serviceId,
      user: user._id,
    }).lean();
    if (!my) return res.json({ rating: null });

    return res.json({ rating: my });
  } catch (err) {
    console.error("getMyRating error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
