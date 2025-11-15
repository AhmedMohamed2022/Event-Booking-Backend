const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  sendMessage,
  getConversation,
  getActiveChats,
} = require("../controllers/chatController");

router.post("/", authMiddleware, sendMessage);
router.get("/active", authMiddleware, getActiveChats);

router.get("/:userId", authMiddleware, getConversation);

module.exports = router;
