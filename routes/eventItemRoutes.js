const express = require("express");
const router = express.Router();
const {
  createEventItem,
  getAllEventItems,
  getEventItemById,
  updateEventItem,
  deleteEventItem,
  searchEventItems,
  subFilterEventItems,
  // uploadEventImages,
  uploadEventMedia,
} = require("../controllers/eventItemController");

const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

// Update the media upload route
router.post(
  "/:id/upload-media",
  authMiddleware,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 5 },
  ]),
  uploadEventMedia
);

router.post("/", authMiddleware, createEventItem);
router.get("/", getAllEventItems);
router.get("/search", searchEventItems);
router.get("/subfilter", subFilterEventItems);
router.get("/:id", getEventItemById);
router.put("/:id", authMiddleware, updateEventItem);
router.delete("/:id", authMiddleware, deleteEventItem);
// router.post(
//   "/:id/upload-images",
//   authMiddleware,
//   upload.array("images"),
//   uploadEventImages
// );

module.exports = router;
