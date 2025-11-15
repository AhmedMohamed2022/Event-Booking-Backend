const JoinRequest = require("../models/JoinRequest");
const User = require("../models/User");
const {
  standardizePhoneByCountry,
  standardizePhoneAuto,
} = require("../utils/phoneUtils");

// Submit join request (public)
exports.submitJoinRequest = async (req, res) => {
  try {
    const { name, phone, phoneCountry, serviceType, city, notes } = req.body;
    const standardizedPhone = standardizePhoneAuto(phone);

    const existing = await JoinRequest.findOne({
      phone: standardizedPhone,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({ message: "Request already submitted" });
    }

    const request = await JoinRequest.create({
      name,
      phone: standardizedPhone,
      country:
        phoneCountry ||
        (standardizedPhone.startsWith("+965") ? "kuwait" : "jordan"),
      serviceType,
      city,
      notes,
    });

    res.status(201).json({
      message: "Join request submitted successfully",
      request,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit join request" });
  }
};

// View all join requests (optional filter)
exports.getJoinRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const requests = await JoinRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to load join requests" });
  }
};

// Approve request → create a supplier account
// exports.approveJoinRequest = async (req, res) => {
//   try {
//     const request = await JoinRequest.findById(req.params.id);

//     if (!request) return res.status(404).json({ message: "Request not found" });

//     if (request.status === "approved") {
//       return res.status(400).json({ message: "Request already approved" });
//     }

//     // Auto-create supplier user if not already registered
//     const existingUser = await User.findOne({ phone: request.phone });
//     if (!existingUser) {
//       await User.create({
//         name: request.name,
//         phone: request.phone,
//         role: "supplier",
//         password: Math.random().toString(36).substring(2, 10), // temporary
//       });
//     }

//     request.status = "approved";
//     await request.save();

//     res.json({ message: "Request approved and supplier account created." });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Approval failed" });
//   }
// };
// Backend: adminController.js

exports.approveJoinRequest = async (req, res) => {
  try {
    // 1. Find the join request
    const joinRequest = await JoinRequest.findById(req.params.id);
    if (!joinRequest) {
      return res.status(404).json({ message: "Join request not found" });
    }

    // 2. Check if request is already approved
    if (joinRequest.status === "approved") {
      return res.status(400).json({ message: "Request already approved" });
    }

    // 3. Create or update user
    let user = await User.findOne({ phone: joinRequest.phone });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        name: joinRequest.name,
        phone: joinRequest.phone,
        country: joinRequest.country || "jordan",
        role: "supplier",
      });
    } else {
      // Update existing user to supplier role
      user.role = "supplier";
      if (joinRequest.country) {
        user.country = joinRequest.country;
      }
      await user.save();
    }

    // 4. Update join request status
    joinRequest.status = "approved";
    await joinRequest.save();

    // 5. Send response
    res.json({
      message: "Join request approved successfully",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Approval Error:", error);
    res.status(500).json({ message: "Failed to approve join request" });
  }
};
// Reject request
exports.rejectJoinRequest = async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject request" });
  }
};

// Mark request as reviewed
exports.markAsReviewed = async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "reviewed";
    await request.save();

    res.json({ message: "Request marked as reviewed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
};
