const express = require("express");
const router = express.Router();
const {
  createContactMessage,
  getContactMessages,
  markAsRead
} = require("../controllers/contactMessageController");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

// Public route for sending messages (matches frontend service)
router.post("/", createContactMessage);

// Admin routes for managing messages
router.get("/", [authMiddleware, adminOnly], getContactMessages);
router.patch("/:messageId/read", [authMiddleware, adminOnly], markAsRead);

module.exports = router;
