require("dotenv").config();
const http = require("http");
const app = require("./app");
const Message = require("./models/Message");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// 🌐 Create HTTP server
const server = http.createServer(app);

// 🔌 Setup Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make socket.io instance available to the app
app.set("io", io);

// Add error handling for socket.io
io.engine.on("connection_error", (err) => {
  console.error("Socket.io connection error:", err);
});

// 🔐 JWT authentication middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// 🎯 Real-time chat logic
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.user?.id);

  // Join personal room
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle message sending (for direct socket messages)
  socket.on("sendMessage", async ({ to, text }) => {
    const from = socket.user?.id;

    if (!from || !to || !text) return;

    try {
      const message = await Message.create({ from, to, text });

      // Emit to recipient
      io.to(to).emit("receiveMessage", message);

      // Emit to sender (optional confirmation)
      io.to(from).emit("messageSent", message);
    } catch (err) {
      console.error("❌ Socket message error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected");
  });
});

// 🚀 Connect DB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("📚 MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });
