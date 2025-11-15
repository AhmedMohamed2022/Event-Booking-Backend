const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const {
  publicLimiter,
  authLimiter,
  apiLimiter,
} = require("./middleware/rateLimiters");
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
app.set("trust proxy", 1); // trust first proxy

// 💡 Middlewares
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev")); // Optional: logs each request

// Enhanced security for production
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
  })
);

// Configure CORS - Single configuration to avoid conflicts
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["https://monasabatcm.netlify.app"]
      : "http://localhost:4200",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-auth-token",
    "Origin",
    "Accept",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  preflightContinue: false,
};

// Log CORS configuration for debugging
console.log("🔧 CORS Configuration:", {
  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
  allowedOrigins: corsOptions.origin,
});

app.use(cors(corsOptions));

// // Configure rate limiter
// app.use(
//   rateLimit({
//     windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
//     max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
//   })
// );

// ✅ Routes with specific rate limiters
// Public routes
app.use("/", publicLimiter);

// Auth routes - stricter limits
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/join", authLimiter, joinRoutes);

// Protected API routes - more generous limits
app.use("/api/event-items", apiLimiter, eventItemRoutes);
app.use("/api/bookings", apiLimiter, bookingRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/supplier", apiLimiter, supplierRoutes);
app.use("/api/chat", apiLimiter, chatRoutes);
app.use("/api/subscription", apiLimiter, subscriptionRoutes);
app.use("/api/contact", apiLimiter, contactMessageRoutes);
app.use("/api/contact-request", apiLimiter, contactRoutes);

// 🏁 Root test
app.get("/", (req, res) => res.send("✅ Event Booking API is running."));

// CORS test endpoint
app.options("/api/cors-test", (req, res) => {
  res.status(200).end();
});

app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS is working!",
    origin: req.headers.origin,
    corsOrigin: process.env.CORS_ORIGIN,
    nodeEnv: process.env.NODE_ENV,
  });
});

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
