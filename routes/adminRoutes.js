const express = require("express");
const router = express.Router();
const {
  getAdminStats,
  unlockSupplier,
  getAllSubscriptions,
  getSubscriptionDetails,
  updateSubscription,
  cancelSubscription,
  extendSubscription,
  getSubscriptionStats,
  getSuppliersNeedingAttention,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

// General admin stats
router.get("/stats", authMiddleware, adminOnly, getAdminStats);

// Supplier management
router.patch("/unlock/:id", authMiddleware, adminOnly, unlockSupplier);
router.get(
  "/suppliers/attention",
  authMiddleware,
  adminOnly,
  getSuppliersNeedingAttention
);

// Subscription management
router.get("/subscriptions", authMiddleware, adminOnly, getAllSubscriptions);
router.get(
  "/subscriptions/stats",
  authMiddleware,
  adminOnly,
  getSubscriptionStats
);
router.get(
  "/subscriptions/:id",
  authMiddleware,
  adminOnly,
  getSubscriptionDetails
);
router.put("/subscriptions/:id", authMiddleware, adminOnly, updateSubscription);
router.patch(
  "/subscriptions/:id/cancel",
  authMiddleware,
  adminOnly,
  cancelSubscription
);
router.patch(
  "/subscriptions/:id/extend",
  authMiddleware,
  adminOnly,
  extendSubscription
);

module.exports = router;
