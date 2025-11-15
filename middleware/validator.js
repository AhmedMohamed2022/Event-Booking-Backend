const { body, validationResult } = require("express-validator");

// Validation rules for OTP sending
const sendOtpValidator = [
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
];

// Validation rules for OTP verification
const verifyOtpValidator = [
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

// Validation rules for booking creation
const bookingValidator = [
  body("eventItemId").isMongoId().withMessage("Invalid event item ID"),
  body("eventDate").isISO8601().withMessage("Invalid date format"),
  body("numberOfPeople")
    .isInt({ min: 1 })
    .withMessage("Invalid number of people"),
];

// Validation rules for event item creation
const eventItemValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("category").notEmpty().withMessage("Category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Invalid price"),
  body("location.city").notEmpty().withMessage("City is required"),
];

// Middleware to handle validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "fail",
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  sendOtpValidator,
  verifyOtpValidator,
  bookingValidator,
  eventItemValidator,
  validate,
};
