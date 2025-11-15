const ContactMessage = require("../models/ContactMessage");
const { formatMessage } = require("../utils/messages");

exports.createContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const contactMessage = await ContactMessage.create({
      name,
      email,
      message,
    });

    res.status(201).json({
      success: true,
      message: formatMessage("contactMessageSent", lang),
    });
  } catch (error) {
    console.error("Contact Message Error:", error);
    res.status(500).json({
      success: false,
      message: formatMessage("contactMessageFailed", lang),
    });
  }
};

// Admin access to messages
exports.getContactMessages = async (req, res) => {
  try {
    // Ensure user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .select("name email message createdAt status");

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({
      success: false,
      message: formatMessage("getMessagesFailed", req.lang),
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await ContactMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.status = "read";
    await message.save();

    res.json({
      success: true,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Mark message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
    });
  }
};