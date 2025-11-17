const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const wishlistController = require("../controllers/wishlistController");

// All routes require authentication
router.use(auth);

// Toggle wishlist (add or remove)
router.post("/toggle", wishlistController.toggleWishlist);

// Get user's complete wishlist
router.get("/", wishlistController.getWishlist);

// Check if a service is in wishlist
router.get("/check/:serviceId", wishlistController.checkWishlistStatus);

// Check multiple services at once
router.post("/check-multiple", wishlistController.checkWishlistStatuses);

// Add to wishlist
router.post("/add", wishlistController.addToWishlist);

// Remove from wishlist
router.delete("/:serviceId", wishlistController.removeFromWishlist);

module.exports = router;
