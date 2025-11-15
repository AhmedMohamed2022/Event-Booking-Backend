const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  getCurrentSubscription,
  getSubscriptionStats,
  renewSubscription,
  toggleAutoRenew,
  getAvailablePlans,
} = require("../controllers/subscriptionController");

router.get("/current", authMiddleware, getCurrentSubscription);
router.get("/stats", authMiddleware, getSubscriptionStats);
router.get("/plans", authMiddleware, getAvailablePlans);
router.post("/renew", authMiddleware, renewSubscription);
router.patch("/auto-renew", authMiddleware, toggleAutoRenew);

module.exports = router;
