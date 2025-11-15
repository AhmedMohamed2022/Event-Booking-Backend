const EventItem = require("../models/EventItem");
const Booking = require("../models/Booking");
const User = require("../models/User");
const {
  isContactOnlyCategory,
  FREE_CONTACT_LIMIT,
  shouldWarnSupplier,
} = require("../utils/subscription");

exports.getSupplierDashboard = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const supplier = await User.findById(supplierId);
    const services = await EventItem.find({ supplier: supplierId });

    // Initialize response object
    const response = {
      supplier: {
        id: supplier._id,
        name: supplier.name,
        phone: supplier.phone,
        serviceCount: services.length,
        isLocked: supplier.isLocked,
      },
      services,
    };

    // Check if supplier has any contact-only services
    const hasContactOnlyServices = services.some((service) =>
      isContactOnlyCategory(service.category)
    );

    if (hasContactOnlyServices) {
      // Add contact stats for Hall/Farm suppliers
      response.supplier.contactStats = {
        total: supplier.contactCount || 0,
        remaining: FREE_CONTACT_LIMIT - (supplier.contactCount || 0),
        isWarning: shouldWarnSupplier(supplier.contactCount || 0),
      };
    } else {
      // Add booking stats for regular suppliers
      const serviceIds = services.map((s) => s._id);
      const bookings = await Booking.find({ eventItem: { $in: serviceIds } })
        .populate("eventItem", "name category")
        .populate("client", "name phone")
        .sort({ createdAt: -1 });

      const total = bookings.length;
      const pending = bookings.filter((b) => b.status === "pending").length;
      const confirmed = bookings.filter((b) => b.status === "confirmed").length;
      const cancelled = bookings.filter((b) => b.status === "cancelled").length;
      const revenue = bookings
        .filter((b) => b.status === "confirmed")
        .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

      // Keep the existing bookingStats object for backward compatibility
      response.supplier.bookingStats = {
        total,
        pending,
        confirmed,
        cancelled,
        revenue,
      };

      // Also add flattened fields that the frontend component expects
      response.supplier.totalBookings = total;
      response.supplier.pendingBookings = pending;
      response.supplier.confirmedBookings = confirmed;
      response.supplier.cancelledBookings = cancelled;
      response.supplier.totalRevenue = revenue;

      response.bookings = bookings;
    }

    res.json(response);
  } catch (err) {
    console.error("Supplier Dashboard Error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};
