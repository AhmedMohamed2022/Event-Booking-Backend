const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    const { to, text } = req.body;
    const from = req.user.id; // From auth middleware

    const message = await Message.create({ from, to, text });

    // Emit to socket for real-time delivery
    const io = req.app.get("io"); // Get socket.io instance from app
    if (io) {
      // Emit to recipient
      io.to(to).emit("receiveMessage", message);

      // Emit to sender (optional confirmation)
      io.to(from).emit("messageSent", message);

      console.log(`Message emitted via socket: ${message._id}`);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: userId },
        { from: userId, to: currentUserId },
      ],
    }).sort({ createdAt: "asc" });

    res.json(messages);
  } catch (err) {
    console.error("Get conversation error:", err);
    res.status(500).json({ message: "Failed to get conversation" });
  }
};
//  method to get active chats

exports.getActiveChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages where user is either sender or receiver
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("from to", "name");

    // Group messages by conversation
    const chats = messages.reduce((acc, msg) => {
      const otherUser = msg.from._id.toString() === userId ? msg.to : msg.from;
      const chatId = otherUser._id.toString();

      if (!acc[chatId]) {
        acc[chatId] = {
          otherUser: {
            _id: otherUser._id,
            name: otherUser.name,
          },
          lastMessage: {
            content: msg.text,
            timestamp: msg.createdAt,
          },
          unreadCount: msg.to._id.toString() === userId && !msg.read ? 1 : 0,
        };
      }
      return acc;
    }, {});

    res.json(Object.values(chats));
  } catch (err) {
    console.error("Get active chats error:", err);
    res.status(500).json({ message: "Failed to get active chats" });
  }
};
