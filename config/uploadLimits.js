const UPLOAD_LIMITS = {
  IMAGE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB (conservative to avoid quota issues)
    MAX_COUNT: 5,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
    ERROR_MESSAGES: {
      SIZE: "Image size must be less than 10MB",
      TYPE: "Only JPEG, PNG and WebP images are allowed",
      COUNT: "Maximum 5 images allowed",
    },
  },
  VIDEO: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB (conservative for free plan)
    MAX_COUNT: 2,
    ALLOWED_TYPES: ["video/mp4", "video/webm"],
    ERROR_MESSAGES: {
      SIZE: "Video size must be less than 50MB",
      TYPE: "Only MP4 and WebM videos are allowed",
      COUNT: "Maximum 2 videos allowed",
    },
  },
};

module.exports = UPLOAD_LIMITS;
