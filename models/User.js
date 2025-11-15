const mongoose = require("mongoose");
const {
  isValidJordanPhone,
  isValidKuwaitPhone,
  standardizeJordanPhone,
  standardizeKuwaitPhone,
  standardizePhoneByCountry,
  standardizePhoneAuto,
} = require("../utils/phoneUtils");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (phone) {
          // Use the same auto-standardization logic the controllers use.
          // If standardization succeeds and the number validates as Jordan or Kuwait, accept it.
          try {
            const standardized = standardizePhoneAuto(phone);
            return (
              isValidJordanPhone(standardized) ||
              isValidKuwaitPhone(standardized)
            );
          } catch (err) {
            return false;
          }
        },
        message: (props) =>
          `${props.value} is not a valid Jordan or Kuwait phone number!`,
      },
    },
    country: {
      type: String,
      enum: ["jordan", "kuwait"],
      default: "jordan",
    },
    role: {
      type: String,
      enum: ["client", "supplier", "admin"],
      default: "client",
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    contactCount: {
      type: Number,
      default: 0,
    },
    lockReason: String,
    lockExpiryDate: Date,
    language: {
      type: String,
      enum: ["ar", "en"],
      default: "ar",
    },
  },
  { timestamps: true }
);

// Add a pre-save middleware to format phone numbers
userSchema.pre("save", function (next) {
  if (this.isModified("phone")) {
    try {
      // Determine country based on phone number prefix
      if (this.phone.startsWith("+965")) {
        this.country = "kuwait";
        this.phone = standardizeKuwaitPhone(this.phone);
      } else {
        this.country = "jordan";
        this.phone = standardizePhoneByCountry(this.phone, "jordan");
      }
    } catch (error) {
      next(error);
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
