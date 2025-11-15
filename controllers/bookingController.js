const Booking = require("../models/Booking");
const EventItem = require("../models/EventItem");
const User = require("../models/User");
const { shouldEnforceLimit } = require("../utils/subscription");
const sendWhatsAppNotification = require("../utils/whatsapp");
const { formatMessage } = require("../utils/messages");
const { isContactOnlyCategory } = require("../utils/subscription");

exports.createBooking = async (req, res) => {
  try {
    const { eventItemId, eventDate, numberOfPeople } = req.body;
    const item = await EventItem.findById(eventItemId).populate("supplier");

    if (!item) {
      return res.status(404).json({ message: "Event item not found" });
    }

    // Check if category is contact-only
    if (isContactOnlyCategory(item.category)) {
      return res.status(400).json({
        message: formatMessage("invalidBookingCategory", req.lang),
      });
    }

    // Prevent booking when supplier didn't provide a price (contact-only)
    let usedPrice = item.price;
    let usedCurrency = item.priceCurrency || "JOD";

    if (
      item.priceAvailable === false ||
      item.price === undefined ||
      item.price === null ||
      item.priceType === "not_provided"
    ) {
      // Allow conversion to booking if the client provided a contactRequestId and
      // the supplier has quoted a price for that request which hasn't been converted yet
      const { contactRequestId } = req.body;
      if (!contactRequestId) {
        return res.status(403).json({
          message:
            formatMessage("booking.error.priceNotAvailable", req.lang) ||
            "Price not available for this service. Please contact the supplier.",
        });
      }

      // Validate contact request
      const ContactRequest = require("../models/ContactRequest");
      const cr = await ContactRequest.findById(contactRequestId);
      if (!cr) {
        return res.status(404).json({ message: "Contact request not found" });
      }

      if (cr.service.toString() !== item._id.toString()) {
        return res
          .status(400)
          .json({ message: "Contact request does not match service" });
      }

      if (!cr.quotedPrice || !cr.quotedPrice.amount) {
        return res
          .status(400)
          .json({ message: "No quoted price available on request" });
      }

      if (cr.convertedToBooking) {
        return res
          .status(400)
          .json({ message: "Contact request already converted to booking" });
      }

      // Use quoted price for booking
      usedPrice = cr.quotedPrice.amount;
      usedCurrency = cr.quotedPrice.currency || usedCurrency;

      // We'll mark contact request converted after booking is created successfully
      var markConvertedRequest = cr;
    }

    // Step 1: Validate eventDate is available
    const requestedDateObj = new Date(eventDate);

    // Prefer the model helper which understands both the new `availability`
    // shape (dateRange + excludedDates) and the legacy `availableDates`.
    let available = false;
    try {
      if (typeof item.isDateAvailable === "function") {
        available = item.isDateAvailable(requestedDateObj);
      } else {
        // Defensive fallback when method is not present (older document shape)
        const requestedISO = requestedDateObj.toISOString();
        available = (item.availableDates || []).some(
          (d) => new Date(d).toISOString() === requestedISO
        );

        // If still not available, check the availability.dateRange form
        if (!available && item.availability && item.availability.dateRange) {
          const from = new Date(item.availability.dateRange.from);
          const to = new Date(item.availability.dateRange.to);
          if (requestedDateObj >= from && requestedDateObj <= to) {
            const excluded = item.availability.excludedDates || [];
            available = !excluded.some(
              (ex) =>
                new Date(ex).toDateString() === requestedDateObj.toDateString()
            );
          }
        }
      }
    } catch (err) {
      console.error("Error checking availability:", err);
      available = false;
    }

    if (!available) {
      return res
        .status(400)
        .json({ message: "Selected date is not available for this service." });
    }

    // Step 2: Check supplier lock
    const supplier = await User.findById(item.supplier._id);
    if (supplier.isLocked) {
      return res.status(403).json({
        message:
          "هذا المزود تجاوز الحد المجاني للحجوزات. يرجى الاشتراك لمواصلة استقبال الحجوزات.",
      });
    }

    // Step 3: Booking creation
    const totalPrice = usedPrice || 0;
    const paidAmount = totalPrice * 0.1;

    const booking = await Booking.create({
      eventItem: item._id,
      client: req.user.id,
      eventDate,
      numberOfPeople,
      totalPrice,
      paidAmount,
      currency: usedCurrency,
    });

    // Step 4: Booking limit and notifications
    if (shouldEnforceLimit(item.category)) {
      supplier.bookingCount += 1;

      if (supplier.bookingCount >= 41 && supplier.bookingCount < 50) {
        await sendWhatsAppNotification(
          supplier.phone,
          `تنبيه: اقتربت من الحد المجاني للحجوزات (${supplier.bookingCount} من 50).`
        );
      }

      if (supplier.bookingCount === 50) {
        supplier.isLocked = true;
        await sendWhatsAppNotification(
          supplier.phone,
          `تنبيه أخير: وصلت إلى الحد المجاني للحجوزات (50). تم إيقاف الحساب مؤقتًا.`
        );
      }

      await supplier.save();
    }

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });

    // Mark contact request as converted if applicable
    if (markConvertedRequest) {
      try {
        markConvertedRequest.convertedToBooking = true;
        await markConvertedRequest.save();
      } catch (e) {
        console.error("Failed to mark contact request converted:", e.message);
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.getBookingsByUser = async (req, res) => {
  try {
    const bookings = await Booking.find({ client: req.user.id }).populate(
      "eventItem",
      "name price category images"
    );

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load user bookings" });
  }
};

exports.getBookingsForSupplier = async (req, res) => {
  try {
    const items = await EventItem.find({ supplier: req.user.id }).select("_id");
    const itemIds = items.map((i) => i._id);

    const bookings = await Booking.find({ eventItem: { $in: itemIds } })
      .populate("eventItem", "name category price")
      .populate("client", "name phone");

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load supplier bookings" });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("eventItem", "name category supplier")
      .populate("client", "name phone");

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load bookings" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    // ✅ Ensure status is one of your enum values
    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const booking = await Booking.findById(bookingId).populate("eventItem");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // ✅ Allow only the supplier who owns the event item to update the status
    if (booking.eventItem.supplier.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized" });
    }

    booking.status = status;
    await booking.save();

    res.json({
      message: `Booking ${
        status === "confirmed" ? "confirmed" : "cancelled"
      } successfully`,
      booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update booking status" });
  }
};
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ client: req.user.id })
      .populate("eventItem", "name category location images price")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your bookings" });
  }
};
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      client: req.user.id,
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending bookings can be cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cancel failed" });
  }
};
