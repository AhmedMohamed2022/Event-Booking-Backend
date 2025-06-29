const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const dotenv = require("dotenv");
const errorHandler = require("./middleware/errorHandler");
require("./utils/cronJobs");

// Load environment variables
dotenv.config();

const authRoutes = require("./routes/authRoutes");
const eventItemRoutes = require("./routes/eventItemRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const joinRoutes = require("./routes/joinRoutes");
const chatRoutes = require("./routes/chatRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const contactRoutes = require("./routes/contactRoutes");
const contactMessageRoutes = require("./routes/contactMessageRoutes");

const app = express();

// 💡 Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev")); // Optional: logs each request

// Enhanced security for production
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  })
);

// Configure CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN : "*",
    credentials: true,
  })
);

// Configure rate limiter
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  })
);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/event-items", eventItemRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/subscription", subscriptionRoutes); // Note: singular to match frontend
app.use("/api/contact", contactMessageRoutes); // This matches your frontend service
app.use("/api/contact-request", contactRoutes); // Add contact request routes for suppliers

// 🏁 Root test
app.get("/", (req, res) => res.send("✅ Event Booking API is running."));

// 🔻 Global Error Handler
app.use(errorHandler);

// Production error handler
if (process.env.NODE_ENV === "production") {
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error" });
  });
}

module.exports = app;
