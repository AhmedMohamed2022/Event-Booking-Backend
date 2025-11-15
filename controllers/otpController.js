const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  standardizeJordanPhone,
  standardizeKuwaitPhone,
  standardizePhoneByCountry,
  standardizePhoneAuto,
  formatPhoneForDisplay,
} = require("../utils/phoneUtils");
const generateOTP = require("../utils/generateOTP");
const sendWhatsAppNotification = require("../utils/whatsapp");
const { formatMessage } = require("../utils/messages");

// Use Map for OTP storage with auto-expiry
const otpStore = new Map();
const OTP_EXPIRY =
  parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 * 1000 || 5 * 60 * 1000;

exports.sendOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;

    // Automatically standardize phone number based on country code
    const standardizedPhone = standardizePhoneAuto(phone);

    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    // Generate real OTP even in development
    const otp = generateOTP(6);

    // Store OTP with expiration
    otpStore.set(standardizedPhone, {
      otp,
      name,
      timestamp: Date.now(),
    });

    // Auto-delete expired OTP
    setTimeout(() => otpStore.delete(standardizedPhone), OTP_EXPIRY);

    // Log OTP in console for development
    console.log(`📲 OTP for ${standardizedPhone}: ${otp}`);

    // Return response with OTP (for now)
    res.json({
      message: formatMessage("otpSent", lang),
      phone: formatPhoneForDisplay(standardizedPhone),
      otp: otp, // Always include OTP until WhatsApp is integrated
      expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      message: formatMessage("sendOtpFailed", lang),
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;

    // Automatically standardize phone number based on country code
    const standardizedPhone = standardizePhoneAuto(phone);

    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    const stored = otpStore.get(standardizedPhone);

    if (!stored || stored.otp !== otp) {
      return res.status(400).json({
        message: formatMessage("invalidOtp", lang),
      });
    }

    // Check OTP expiration
    if (Date.now() - stored.timestamp > OTP_EXPIRY) {
      otpStore.delete(standardizedPhone);
      return res.status(400).json({
        message: formatMessage("otpExpired", lang),
      });
    }

    let user = await User.findOne({ phone: standardizedPhone });

    if (!user) {
      // Determine country explicitly from standardized phone to satisfy
      // mongoose validation and pre-save formatting in the User model.
      const country = standardizedPhone.startsWith("+965")
        ? "kuwait"
        : "jordan";

      user = await User.create({
        name: name || stored.name,
        phone: standardizedPhone,
        country,
        role: "client",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        phone: user.phone,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    otpStore.delete(standardizedPhone);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Verification Error:", error);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";
    res.status(500).json({
      message: formatMessage("verificationFailed", lang),
    });
  }
};
