const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  initiateContact,
  sendContactRequest,
  getContactRequests,
  getClientContactRequests,
  getContactLimitInfo,
  updateContactRequestStatus,
  convertContactRequest,
  checkContactRequestStatus,
} = require("../controllers/contactController");

// Legacy endpoint (keeping for backward compatibility)
router.post("/", authMiddleware, initiateContact);

// New contact request endpoints
router.post("/request", authMiddleware, sendContactRequest);
router.get("/requests", authMiddleware, getContactRequests);
router.get("/client-requests", authMiddleware, getClientContactRequests);
router.get("/limit-info", authMiddleware, getContactLimitInfo);
router.get("/request-status", authMiddleware, checkContactRequestStatus);
router.patch(
  "/requests/:requestId",
  authMiddleware,
  updateContactRequestStatus
);
router.post(
  "/requests/:requestId/convert",
  authMiddleware,
  convertContactRequest
);

module.exports = router;
