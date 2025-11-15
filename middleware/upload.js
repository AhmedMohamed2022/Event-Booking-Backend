// const multer = require("multer");

// // Store in memory for direct Cloudinary upload
// const storage = multer.memoryStorage();

// const upload = multer({ storage });

// module.exports = upload;
const multer = require("multer");
const UPLOAD_LIMITS = require("../config/uploadLimits");

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: UPLOAD_LIMITS.VIDEO.MAX_SIZE, // 50MB limit
    fieldSize: UPLOAD_LIMITS.VIDEO.MAX_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images") {
      if (!UPLOAD_LIMITS.IMAGE.ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new Error(UPLOAD_LIMITS.IMAGE.ERROR_MESSAGES.TYPE), false);
      }
      if (file.size > UPLOAD_LIMITS.IMAGE.MAX_SIZE) {
        return cb(new Error(UPLOAD_LIMITS.IMAGE.ERROR_MESSAGES.SIZE), false);
      }
    } else if (file.fieldname === "videos") {
      if (!UPLOAD_LIMITS.VIDEO.ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new Error(UPLOAD_LIMITS.VIDEO.ERROR_MESSAGES.TYPE), false);
      }
      if (file.size > UPLOAD_LIMITS.VIDEO.MAX_SIZE) {
        return cb(new Error(UPLOAD_LIMITS.VIDEO.ERROR_MESSAGES.SIZE), false);
      }
    }
    cb(null, true);
  },
});

module.exports = upload;
