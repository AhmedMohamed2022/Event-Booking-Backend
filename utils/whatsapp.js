// utils/whatsapp.js

const axios = require("axios");
const { formatMessage } = require("./messages");

const sendWhatsAppNotification = async (
  phone,
  messageKey,
  lang = "ar",
  ...args
) => {
  const message = formatMessage(messageKey, lang, ...args);

  if (process.env.NODE_ENV !== "production") {
    console.log(`📲 [DEV] WhatsApp message to ${phone}:`, message);
    return;
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_API_URL) {
    throw new Error("WhatsApp API configuration missing");
  }

  try {
    await axios.post(
      process.env.WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("WhatsApp API Error:", {
      message: error.message,
      response: error.response?.data,
    });
    // In production, we don't want to block the OTP flow if WhatsApp fails
    if (process.env.NODE_ENV !== "production") {
      throw new Error("Failed to send WhatsApp notification");
    }
  }
};

module.exports = sendWhatsAppNotification;
