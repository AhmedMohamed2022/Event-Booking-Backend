const Contact = require("../models/Contact");
const ContactRequest = require("../models/ContactRequest");
const User = require("../models/User");
const EventItem = require("../models/EventItem");
const {
  isContactOnlyCategory,
  shouldWarnSupplier,
  shouldLockSupplier,
  WARNING_THRESHOLD,
  FREE_CONTACT_LIMIT,
} = require("../utils/subscription");
const { formatMessage } = require("../utils/messages");
const sendWhatsAppNotification = require("../utils/whatsapp");

// Send contact request (new method for the updated system)
exports.sendContactRequest = async (req, res) => {
  try {
    const { client, supplier, service, message, via } = req.body;
    const clientId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    // Verify the client is making the request for themselves
    if (client !== clientId) {
      return res.status(403).json({
        success: false,
        message: formatMessage("unauthorized", lang),
      });
    }

    const eventItem = await EventItem.findById(service).populate("supplier");
    if (!eventItem) {
      return res.status(404).json({
        success: false,
        message: formatMessage("eventItemNotFound", lang),
      });
    }

    // Verify this is a contact-only category OR the supplier didn't provide a price
    const priceMissing =
      eventItem.price === undefined ||
      eventItem.price === null ||
      eventItem.priceType === "not_provided" ||
      eventItem.priceAvailable === false;

    if (
      !isContactOnlyCategory(eventItem.category, eventItem.subcategory) &&
      !priceMissing
    ) {
      return res.status(400).json({
        success: false,
        message: formatMessage("invalidContactCategory", lang),
      });
    }

    const supplierUser = await User.findById(supplier);
    if (!supplierUser) {
      return res.status(404).json({
        success: false,
        message: formatMessage("supplierNotFound", lang),
      });
    }

    // Check if supplier is locked
    if (supplierUser.isLocked) {
      return res.status(403).json({
        success: false,
        message: formatMessage("supplierLocked", lang),
      });
    }

    // Create contact request record
    const contactRequest = await ContactRequest.create({
      client: clientId,
      supplier: supplier,
      service: service,
      message: message,
      via: via || "direct",
      status: "pending",
    });

    // Update supplier contact count
    supplierUser.contactCount += 1;

    // Check warning threshold and send notification
    if (shouldWarnSupplier(supplierUser.contactCount)) {
      const remainingContacts = FREE_CONTACT_LIMIT - supplierUser.contactCount;
      await sendWhatsAppNotification(
        supplierUser.phone,
        "contactLimitWarning",
        supplierUser.language || "ar",
        remainingContacts
      );
    }

    // Check lock threshold
    if (shouldLockSupplier(supplierUser.contactCount)) {
      supplierUser.isLocked = true;
      supplierUser.lockReason = "Contact limit reached";

      // Send final notification
      await sendWhatsAppNotification(
        supplierUser.phone,
        "contactLimitReached",
        supplierUser.language || "ar"
      );
    }

    await supplierUser.save();

    res.json({
      success: true,
      message: formatMessage("contactRequestSent", lang),
      contactRequest,
    });
  } catch (error) {
    console.error("Contact Request Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("contactRequestFailed", lang),
    });
  }
};

// Get contact requests for supplier
exports.getContactRequests = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const contactRequests = await ContactRequest.find({ supplier: supplierId })
      .populate("client", "name phone")
      .populate("service", "name category")
      .sort({ createdAt: -1 });

    res.json(contactRequests);
  } catch (error) {
    console.error("Get Contact Requests Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("getContactRequestsFailed", lang),
    });
  }
};

// Get contact requests for client
exports.getClientContactRequests = async (req, res) => {
  try {
    const clientId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const contactRequests = await ContactRequest.find({ client: clientId })
      .populate("supplier", "name phone")
      .populate("service", "name category")
      .sort({ createdAt: -1 });

    res.json(contactRequests);
  } catch (error) {
    console.error("Get Client Contact Requests Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("getContactRequestsFailed", lang),
    });
  }
};

// Get contact limit info for supplier
exports.getContactLimitInfo = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const supplier = await User.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: formatMessage("supplierNotFound", lang),
      });
    }

    const currentContacts = supplier.contactCount || 0;
    const maxContacts = FREE_CONTACT_LIMIT;
    const usagePercentage = (currentContacts / maxContacts) * 100;
    const isLocked = supplier.isLocked || false;
    const hasWarning = currentContacts >= WARNING_THRESHOLD;

    res.json({
      currentContacts,
      maxContacts,
      isLocked,
      lockReason: supplier.lockReason,
      hasWarning,
      warningType: hasWarning ? "near-limit" : undefined,
      usagePercentage: Math.min(usagePercentage, 100),
    });
  } catch (error) {
    console.error("Get Contact Limit Info Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("getContactLimitInfoFailed", lang),
    });
  }
};

// Check contact request status between client and supplier
exports.checkContactRequestStatus = async (req, res) => {
  try {
    const { clientId, supplierId, serviceId } = req.query;
    const currentUserId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    // Verify the user is checking their own request or is the supplier
    if (currentUserId !== clientId && currentUserId !== supplierId) {
      return res.status(403).json({
        success: false,
        message: formatMessage("unauthorized", lang),
      });
    }

    const contactRequest = await ContactRequest.findOne({
      client: clientId,
      supplier: supplierId,
      service: serviceId,
    });

    if (!contactRequest) {
      return res.json({
        status: "none",
      });
    }

    res.json({
      status: contactRequest.status,
      requestId: contactRequest._id,
    });
  } catch (error) {
    console.error("Check Contact Request Status Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("checkContactRequestStatusFailed", lang),
    });
  }
};

// Update contact request status
exports.updateContactRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const supplierId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const contactRequest = await ContactRequest.findById(requestId)
      .populate("client", "name phone email")
      .populate("service", "name category");

    if (!contactRequest) {
      return res.status(404).json({
        success: false,
        message: formatMessage("contactRequestNotFound", lang),
      });
    }

    // Verify the supplier owns this contact request
    if (contactRequest.supplier.toString() !== supplierId) {
      return res.status(403).json({
        success: false,
        message: formatMessage("unauthorized", lang),
      });
    }

    // If supplier is providing a quoted price along with status update, allow it
    if (req.body.quotedPrice && typeof req.body.quotedPrice === "object") {
      contactRequest.quotedPrice = {
        amount: req.body.quotedPrice.amount,
        currency: req.body.quotedPrice.currency,
        priceType: req.body.quotedPrice.priceType,
      };
    }

    contactRequest.status = status;
    await contactRequest.save();

    // If accepted, create a chat room and send notifications
    if (status === "accepted") {
      try {
        // Create chat room between client and supplier
        const Chat = require("../models/Chat");
        const existingChat = await Chat.findOne({
          participants: {
            $all: [contactRequest.client._id, supplierId],
            $size: 2,
          },
        });

        if (!existingChat) {
          const newChat = new Chat({
            participants: [contactRequest.client._id, supplierId],
            type: "contact-request",
            contactRequest: contactRequest._id,
            lastMessage: {
              content: `Contact request for "${contactRequest.service.name}" has been accepted. You can now chat directly with the supplier.`,
              sender: supplierId,
              timestamp: new Date(),
            },
          });
          await newChat.save();
        }

        // Send notification to client (email or in-app notification)
        const client = await User.findById(contactRequest.client._id);
        if (client) {
          // You can implement email notification here
          console.log(
            `Contact request accepted for client: ${client.name} (${client.email})`
          );

          // For now, we'll rely on the client checking their dashboard
          // In the future, you can add email notifications or push notifications
        }

        // Send WhatsApp notification to supplier (if available)
        const supplier = await User.findById(supplierId);
        if (supplier && supplier.phone) {
          try {
            await sendWhatsAppNotification(
              supplier.phone,
              "contactRequestAccepted",
              supplier.language || "ar",
              contactRequest.client.name,
              contactRequest.service.name
            );
          } catch (whatsappError) {
            console.log(
              "WhatsApp notification failed, but request was accepted:",
              whatsappError.message
            );
          }
        }

        // If supplier provided a quoted price and wants it published, optionally update EventItem
        if (contactRequest.quotedPrice && req.body.publishPrice === true) {
          try {
            const item = await EventItem.findById(contactRequest.service);
            if (item) {
              item.price = contactRequest.quotedPrice.amount;
              item.priceCurrency =
                contactRequest.quotedPrice.currency || item.priceCurrency;
              item.priceType =
                contactRequest.quotedPrice.priceType || item.priceType;
              item.priceAvailable = true;
              await item.save();
            }
          } catch (e) {
            console.error(
              "Failed to publish quoted price to EventItem:",
              e.message
            );
          }
        }
      } catch (chatError) {
        console.error("Error creating chat room:", chatError);
        // Don't fail the request if chat creation fails
      }
    } else if (status === "rejected") {
      // Send rejection notification to client
      const client = await User.findById(contactRequest.client._id);
      if (client) {
        console.log(
          `Contact request rejected for client: ${client.name} (${client.email})`
        );
        // You can implement email notification here
      }

      // Send WhatsApp notification to supplier (if available)
      const supplier = await User.findById(supplierId);
      if (supplier && supplier.phone) {
        try {
          await sendWhatsAppNotification(
            supplier.phone,
            "contactRequestRejected",
            supplier.language || "ar",
            contactRequest.client.name,
            contactRequest.service.name
          );
        } catch (whatsappError) {
          console.log(
            "WhatsApp notification failed, but request was rejected:",
            whatsappError.message
          );
        }
      }
    }

    res.json({
      success: true,
      message: formatMessage("contactRequestStatusUpdated", lang),
      contactRequest,
    });
  } catch (error) {
    console.error("Update Contact Request Status Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      success: false,
      message: formatMessage("updateContactRequestStatusFailed", lang),
    });
  }
};

// Convert a quoted contact request into a booking (client action)
exports.convertContactRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const clientId = req.user.id;
    const { eventDate, numberOfPeople } = req.body;

    const contactRequest = await ContactRequest.findById(requestId).populate(
      "service"
    );

    if (!contactRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Contact request not found" });
    }

    if (contactRequest.client.toString() !== clientId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!contactRequest.quotedPrice || !contactRequest.quotedPrice.amount) {
      return res
        .status(400)
        .json({ success: false, message: "No quoted price available" });
    }

    if (contactRequest.convertedToBooking) {
      return res
        .status(400)
        .json({ success: false, message: "Request already converted" });
    }

    // Create booking using quoted price
    const Booking = require("../models/Booking");
    const EventItem = require("../models/EventItem");

    const item = await EventItem.findById(contactRequest.service._id).populate(
      "supplier"
    );
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    const totalPrice = contactRequest.quotedPrice.amount;
    const paidAmount = totalPrice * 0.1;

    const booking = await Booking.create({
      eventItem: item._id,
      client: clientId,
      eventDate,
      numberOfPeople,
      totalPrice,
      paidAmount,
      currency: contactRequest.quotedPrice.currency || "JOD",
    });

    // Mark contact request converted
    contactRequest.convertedToBooking = true;
    await contactRequest.save();

    // Optionally, update item to reflect published price
    if (req.body.publishPrice === true) {
      item.price = contactRequest.quotedPrice.amount;
      item.priceCurrency =
        contactRequest.quotedPrice.currency || item.priceCurrency;
      item.priceType = contactRequest.quotedPrice.priceType || item.priceType;
      item.priceAvailable = true;
      await item.save();
    }

    res
      .status(201)
      .json({
        success: true,
        message: "Booking created from quoted request",
        booking,
      });
  } catch (error) {
    console.error("Convert Contact Request Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to convert request" });
  }
};

// Legacy method (keeping for backward compatibility)
exports.initiateContact = async (req, res) => {
  try {
    const { eventItemId } = req.body;
    const clientId = req.user.id;
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const eventItem = await EventItem.findById(eventItemId).populate(
      "supplier"
    );
    if (!eventItem) {
      return res.status(404).json({
        message: formatMessage("eventItemNotFound", lang),
      });
    }

    // Verify this is a contact-only category
    if (!isContactOnlyCategory(eventItem.category, eventItem.subcategory)) {
      return res.status(400).json({
        message: formatMessage("invalidContactCategory", lang),
      });
    }

    const supplier = await User.findById(eventItem.supplier);

    // Check if supplier is locked
    if (supplier.isLocked) {
      return res.status(403).json({
        message: formatMessage("supplierLocked", lang),
      });
    }

    // Create contact record
    const contact = await Contact.create({
      client: clientId,
      supplier: supplier._id,
      eventItem: eventItemId,
    });

    // Update supplier contact count
    supplier.contactCount += 1;

    // Check warning threshold and send notification
    if (shouldWarnSupplier(supplier.contactCount)) {
      const remainingContacts = FREE_CONTACT_LIMIT - supplier.contactCount;
      await sendWhatsAppNotification(
        supplier.phone,
        "contactLimitWarning",
        supplier.language || "ar",
        remainingContacts
      );
    }

    // Check lock threshold
    if (shouldLockSupplier(supplier.contactCount)) {
      supplier.isLocked = true;
      supplier.lockReason = "Contact limit reached";

      // Send final notification
      await sendWhatsAppNotification(
        supplier.phone,
        "contactLimitReached",
        supplier.language || "ar"
      );
    }

    await supplier.save();

    res.json({
      message: formatMessage("contactInitiated", lang),
      supplierPhone: supplier.phone,
      contact,
      remainingContacts: FREE_CONTACT_LIMIT - supplier.contactCount,
    });
  } catch (error) {
    console.error("Contact Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      message: formatMessage("contactFailed", lang),
    });
  }
};
