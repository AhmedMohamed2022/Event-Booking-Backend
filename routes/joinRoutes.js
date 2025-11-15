const express = require("express");
const router = express.Router();

const {
  submitJoinRequest,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  markAsReviewed,
} = require("../controllers/joinController");

const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
// Admin-only middleware

// Public
router.post("/", submitJoinRequest);

// Admin
router.get("/join-requests", authMiddleware, adminOnly, getJoinRequests);
router.patch("/:id/approve", authMiddleware, adminOnly, approveJoinRequest);
router.patch("/:id/reject", authMiddleware, adminOnly, rejectJoinRequest);
router.patch("/:id/review", authMiddleware, adminOnly, markAsReviewed);

module.exports = router;
