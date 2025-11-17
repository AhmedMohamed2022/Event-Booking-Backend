const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../middleware/auth");
const {
  createOrUpdateRating,
  getRatings,
  getRatingsList,
  getSummary,
  checkEligibility,
} = require("../controllers/ratingController");

// POST /api/event-items/:id/ratings   -> create or update user's rating
router.post("/", authMiddleware, createOrUpdateRating);

// GET /api/event-items/:id/ratings    -> list ratings (paginated)
router.get("/", getRatings);

// GET /api/event-items/:id/ratings/summary -> avg + count
router.get("/summary", getSummary);

// GET /api/event-items/:id/ratings/list -> paginated list under `ratings` key
router.get("/list", getRatingsList);

// GET /api/event-items/:id/ratings/my -> current user's rating
router.get("/my", authMiddleware, (req, res, next) => {
  return require("../controllers/ratingController").getMyRating(req, res, next);
});

// GET /eligible -> returns { eligible: boolean } for authenticated users
router.get("/eligible", authMiddleware, (req, res, next) => {
  // delegate to controller
  return require("../controllers/ratingController").checkEligibility(
    req,
    res,
    next
  );
});

module.exports = router;
