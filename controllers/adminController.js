const User = require("../models/User");
const EventItem = require("../models/EventItem");
const Booking = require("../models/Booking");
const Contact = require("../models/Contact");
const Subscription = require("../models/Subscription");
const ContactMessage = require("../models/ContactMessage");
const { formatMessage } = require("../utils/messages");

exports.getAdminStats = async (req, res) => {
  try {
    // Defensive helper: some environments may have a replaced/incorrect Subscription
    // object where countDocuments isn't available. Use safeCount to avoid runtime
    // TypeError and still return 0 when method not present.
    const safeCount = async (model, filter = {}) => {
      try {
        if (!model || typeof model.countDocuments !== "function") return 0;
        return await model.countDocuments(filter);
      } catch (e) {
        console.warn("safeCount failed:", e);
        return 0;
      }
    };

    const [
      totalUsers,
      totalSuppliers,
      totalServices,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      revenueAgg,
      topCategories,
      contactOnlySuppliers,
      totalLockedSuppliers, // Renamed from lockedSuppliers
      totalContactRequests,
      activeSubscriptions,
      contactMessages,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "supplier" }),
      EventItem.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        { $match: { status: "confirmed" } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
      EventItem.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      User.countDocuments({
        role: "supplier",
        "services.category": { $in: ["wedding-halls", "farm"] },
      }),
      User.countDocuments({ isLocked: true }),
      Contact.countDocuments(),
      safeCount(Subscription, { status: "active" }),
      ContactMessage.countDocuments(),
    ]);

    // Get locked suppliers details
    const lockedSuppliers = await User.find({
      isLocked: true,
      role: "supplier",
    })
      .select("name phone contactCount createdAt category")
      .lean();

    res.json({
      totalUsers,
      totalSuppliers,
      totalServices,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue: revenueAgg[0]?.total || 0,
      topCategories,
      contactOnlySuppliers,
      totalLockedSuppliers, // Count of locked suppliers
      lockedSuppliers, // Detailed locked suppliers info
      totalContactRequests,
      activeSubscriptions,
      contactMessages,
    });
  } catch (err) {
    console.error("❌ Admin stats failed:", err);
    res.status(500).json({ error: "Failed to load admin statistics" });
  }
};

// Add new endpoints for contact messages
exports.getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load contact messages" });
  }
};

// Add endpoint to handle supplier unlocking
exports.unlockSupplier = async (req, res) => {
  try {
    const supplier = await User.findById(req.params.id);

    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found" });
    }

    supplier.isLocked = false;
    supplier.bookingCount = 0;

    await supplier.save();

    res.json({ message: "Supplier has been unlocked successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unlock supplier" });
  }
};

// Subscription Management Functions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;

    const subscriptions = await Subscription.find(filter)
      .populate("supplier", "name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Use safeCount in case Subscription model on production is missing countDocuments
    const total = await safeCount(Subscription, filter);

    res.json({
      subscriptions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("❌ Get subscriptions failed:", err);
    res.status(500).json({ error: "Failed to load subscriptions" });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).populate(
      "supplier",
      "name phone email contactCount isLocked"
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Get supplier's contact history
    const contactHistory = await Contact.find({
      supplier: subscription.supplier._id,
    })
      .populate("client", "name phone")
      .populate("eventItem", "name category")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      subscription,
      contactHistory,
      supplier: subscription.supplier,
    });
  } catch (err) {
    console.error("❌ Get subscription details failed:", err);
    res.status(500).json({ error: "Failed to load subscription details" });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { status, plan, endDate, autoRenew } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Update fields
    if (status) subscription.status = status;
    if (plan) subscription.plan = plan;
    if (endDate) subscription.endDate = new Date(endDate);
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

    await subscription.save();

    // If subscription is cancelled/expired, lock the supplier
    if (status === "cancelled" || status === "expired") {
      const supplier = await User.findById(subscription.supplier);
      if (supplier) {
        supplier.isLocked = true;
        supplier.lockReason = `Subscription ${status} by admin`;
        await supplier.save();
      }
    }

    res.json({
      message: "Subscription updated successfully",
      subscription,
    });
  } catch (err) {
    console.error("❌ Update subscription failed:", err);
    res.status(500).json({ error: "Failed to update subscription" });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || "Cancelled by admin";
    await subscription.save();

    // Lock the supplier
    const supplier = await User.findById(subscription.supplier);
    if (supplier) {
      supplier.isLocked = true;
      supplier.lockReason = `Subscription cancelled by admin: ${
        reason || "No reason provided"
      }`;
      await supplier.save();
    }

    res.json({
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (err) {
    console.error("❌ Cancel subscription failed:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
};

exports.extendSubscription = async (req, res) => {
  try {
    const { days, reason } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // Extend the subscription
    const currentEndDate = new Date(subscription.endDate);
    currentEndDate.setDate(currentEndDate.getDate() + parseInt(days));
    subscription.endDate = currentEndDate;

    // Add extension note
    if (!subscription.notes) subscription.notes = [];
    subscription.notes.push({
      date: new Date(),
      action: "extended",
      days: parseInt(days),
      reason: reason || "Extended by admin",
      adminId: req.user.id,
    });

    await subscription.save();

    res.json({
      message: `Subscription extended by ${days} days`,
      subscription,
    });
  } catch (err) {
    console.error("❌ Extend subscription failed:", err);
    res.status(500).json({ error: "Failed to extend subscription" });
  }
};

exports.getSubscriptionStats = async (req, res) => {
  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      basicSubscriptions,
      premiumSubscriptions,
      revenueByPlan,
      subscriptionsByMonth,
      expiringThisWeek,
      expiringThisMonth,
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "expired" }),
      Subscription.countDocuments({ status: "cancelled" }),
      Subscription.countDocuments({ plan: "basic" }),
      Subscription.countDocuments({ plan: "premium" }),
      Subscription.aggregate([
        { $group: { _id: "$plan", total: { $sum: "$amount" } } },
      ]),
      Subscription.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
      Subscription.countDocuments({
        status: "active",
        endDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      Subscription.countDocuments({
        status: "active",
        endDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    res.json({
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      basicSubscriptions,
      premiumSubscriptions,
      revenueByPlan,
      subscriptionsByMonth,
      expiringThisWeek,
      expiringThisMonth,
    });
  } catch (err) {
    console.error("❌ Get subscription stats failed:", err);
    res.status(500).json({ error: "Failed to load subscription statistics" });
  }
};

exports.getSuppliersNeedingAttention = async (req, res) => {
  try {
    // Get suppliers who are locked or near contact limit
    const suppliers = await User.find({
      role: "supplier",
      $or: [
        { isLocked: true },
        { contactCount: { $gte: 40 } }, // Near limit
      ],
    })
      .select("name phone contactCount isLocked lockReason createdAt")
      .populate({
        path: "subscriptions",
        match: { status: "active" },
        select: "plan endDate",
      })
      .sort({ contactCount: -1 });

    res.json(suppliers);
  } catch (err) {
    console.error("❌ Get suppliers needing attention failed:", err);
    res.status(500).json({ error: "Failed to load suppliers" });
  }
};
