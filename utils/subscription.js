// utils/subscription.js

// Contact-only categories and subcategories that bypass booking system and use direct contact
const CONTACT_ONLY_CATEGORIES = [
  "farm", // Farm category is entirely contact-only
  "halls", // Halls category is entirely contact-only
];

const CONTACT_ONLY_SUBCATEGORIES = [
  "wedding-halls", // Wedding halls are contact-only
  "venues", // Venues are contact-only
  "conference-halls", // Conference halls are contact-only
  "funeral-halls", // Funeral halls are contact-only
  "tents", // Tents are contact-only
];

const FREE_CONTACT_LIMIT = 50;
const WARNING_THRESHOLD = 40; // 80% of 50 = 40 contacts

function isContactOnlyCategory(category, subcategory = null) {
  // Check if the entire category is contact-only
  if (CONTACT_ONLY_CATEGORIES.includes(category)) {
    return true;
  }

  // Accept subcategory as string or array
  if (Array.isArray(subcategory)) {
    return subcategory.some((s) => CONTACT_ONLY_SUBCATEGORIES.includes(s));
  }

  // Check if the specific subcategory is contact-only
  if (subcategory && CONTACT_ONLY_SUBCATEGORIES.includes(subcategory)) {
    return true;
  }

  return false;
}

function shouldEnforceLimit(category, subcategory = null) {
  // Don't enforce limits for contact-only categories/subcategories
  return !isContactOnlyCategory(category, subcategory);
}

function shouldWarnSupplier(contactCount, maxContacts = FREE_CONTACT_LIMIT) {
  const warningThreshold = Math.floor(maxContacts * 0.8); // 80% of limit
  return contactCount >= warningThreshold && contactCount < maxContacts;
}

function shouldLockSupplier(contactCount, maxContacts = FREE_CONTACT_LIMIT) {
  return contactCount >= maxContacts;
}

// Add new constants
const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: "basic",
    contactLimit: FREE_CONTACT_LIMIT,
    duration: 30, // days
    price: 0,
  },
  PREMIUM: {
    name: "premium",
    contactLimit: 100,
    duration: 30,
    price: 199,
  },
  ENTERPRISE: {
    name: "enterprise",
    contactLimit: 500,
    duration: 30,
    price: 499,
  },
};

module.exports = {
  CONTACT_ONLY_CATEGORIES,
  CONTACT_ONLY_SUBCATEGORIES,
  FREE_CONTACT_LIMIT,
  WARNING_THRESHOLD,
  isContactOnlyCategory,
  shouldEnforceLimit,
  shouldWarnSupplier,
  shouldLockSupplier,
  SUBSCRIPTION_PLANS,
};
