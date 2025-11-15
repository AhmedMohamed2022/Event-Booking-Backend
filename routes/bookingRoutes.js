const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookingsByUser,
  getBookingsForSupplier,
  getAllBookings,
  updateBookingStatus,
  getMyBookings,
  cancelBooking,
} = require("../controllers/bookingController");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, createBooking);
router.get("/my-bookings", authMiddleware, getBookingsByUser);
router.get("/my", authMiddleware, getMyBookings);
router.patch("/:id/cancel", authMiddleware, cancelBooking);
router.get("/supplier-bookings", authMiddleware, getBookingsForSupplier);
router.get("/all", authMiddleware, getAllBookings); // (Optional: Admin only)
router.put("/:bookingId/status", authMiddleware, updateBookingStatus);

module.exports = router;
