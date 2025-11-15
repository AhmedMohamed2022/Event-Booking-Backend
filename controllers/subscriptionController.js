const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { formatMessage } = require("../utils/messages");
const {
  SUBSCRIPTION_PLANS,
  shouldWarnSupplier,
  shouldLockSupplier,
} = require("../utils/subscription");
const sendWhatsAppNotification = require("../utils/whatsapp");
const notifications = require("../utils/notifications");
const { addDays } = require("date-fns");

// Defensive helper available to all functions in this module. Some deployments
// may have an incorrect value for the model (not a Mongoose model), so guard
// against calling model methods directly in those environments.
const safeFindOne = async (model, filter = {}) => {
  try {
    if (!model || typeof model.findOne !== "function") return null;
    return await model.findOne(filter);
  } catch (e) {
    console.warn("safeFindOne failed:", e);
    return null;
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const supplier = await User.findById(req.user.id);
    const lang = req.headers["accept-language"]?.includes("en") ? "en" : "ar";

    // Calculate end date (30 days from now)
    const endDate = addDays(new Date(), 30);

    const subscription = await Subscription.create({
      supplier: supplier._id,
      plan,
      startDate: new Date(),
      endDate,
      amount: SUBSCRIPTION_PLANS[plan.toUpperCase()]?.price || 0,
      autoRenew: false,
    });

    // Unlock supplier
    supplier.isLocked = false;
    supplier.contactCount = 0; // Reset contact count
    await supplier.save();

    // Send notification
    await sendWhatsAppNotification(
      supplier.phone,
      "subscriptionCreated",
      lang,
      plan
    );

    res.status(201).json({
      message: formatMessage("subscriptionCreated", lang),
      subscription,
    });
  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).json({
      message: formatMessage("subscriptionFailed", req.lang),
    });
  }
};

// exports.getSubscriptionStatus = async (req, res) => {
//   try {
//     const subscription = await Subscription.findOne({
//       supplier: req.user.id,
//       status: "active",
//     });

//     const user = await User.findById(req.user.id);
//     const plan = subscription?.plan || "basic";
//     const contactLimit =
//       SUBSCRIPTION_PLANS[plan.toUpperCase()]?.contactLimit || 50;

//     if (!subscription) {
//       return res.json({
//         status: "inactive",
//         contactsUsed: user.contactCount || 0,
//         contactLimit: contactLimit,
//       });
//     }

//     // Calculate stats
//     const stats = {
//       isLocked: user.isLocked,
//       usagePercentage: ((user.contactCount || 0) / contactLimit) * 100,
//       daysUntilExpiry: Math.ceil(
//         (new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
//       ),
//       hasWarning: false,
//       warningType: undefined,
//     };

//     // Add warning logic using the updated functions
//     if (shouldWarnSupplier(user.contactCount || 0, contactLimit)) {
//       stats.hasWarning = true;
//       stats.warningType = "near-limit";
//     }
//     if (stats.daysUntilExpiry < 7) {
//       stats.hasWarning = true;
//       stats.warningType = "expiring";
//     }
//     if (stats.isLocked) {
//       stats.hasWarning = true;
//       stats.warningType = "locked";
//     }

//     res.json({
//       subscription: {
//         _id: subscription._id,
//         status: subscription.status,
//         plan: subscription.plan,
//         startDate: subscription.startDate,
//         endDate: subscription.endDate,
//         contactLimit: contactLimit,
//         contactsUsed: user.contactCount || 0,
//       },
//       stats,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to get subscription status" });
//   }
// };

// Remove the old versions and keep only this one
exports.getSubscriptionStats = async (req, res) => {
  try {
    // Defensive helper: safeFindOne ensures we don't call .findOne on a non-model
    const safeFindOne = async (model, filter = {}) => {
      try {
        if (!model || typeof model.findOne !== "function") return null;
        return await model.findOne(filter);
      } catch (e) {
        console.warn("safeFindOne failed:", e);
        return null;
      }
    };

    const subscription = await safeFindOne(Subscription, {
      supplier: req.user.id,
      status: "active",
    });

    const user = await User.findById(req.user.id);
    const plan = subscription?.plan || "basic";
    const contactLimit =
      SUBSCRIPTION_PLANS[plan.toUpperCase()]?.contactLimit || 50;

    // Calculate stats
    const stats = {
      isLocked: user.isLocked,
      usagePercentage: ((user.contactCount || 0) / contactLimit) * 100,
      daysUntilExpiry: subscription
        ? Math.ceil(
            (new Date(subscription.endDate) - new Date()) /
              (1000 * 60 * 60 * 24)
          )
        : 0,
      hasWarning: false,
      warnings: [],
      warningType: undefined,
      currentContacts: user.contactCount || 0,
      maxContacts: contactLimit,
    };

    // Contact limit warning - only show when contacts are near limit
    const contactWarningThreshold = Math.floor(contactLimit * 0.8);
    if (
      user.contactCount >= contactWarningThreshold &&
      user.contactCount < contactLimit
    ) {
      stats.hasWarning = true;
      stats.warnings.push("near-limit");
      stats.warningType = "near-limit";
    }

    // Subscription expiry warning - only show in last 7 days AND if user has active contacts
    if (subscription && stats.daysUntilExpiry < 7 && user.contactCount > 0) {
      stats.hasWarning = true;
      stats.warnings.push("expiring");
      // Only set expiry warning if no contact limit warning
      if (!stats.warningType) {
        stats.warningType = "expiring";
      }
    }

    // Lock warning takes precedence
    if (stats.isLocked) {
      stats.hasWarning = true;
      stats.warnings.push("locked");
      stats.warningType = "locked"; // Locked state overrides other warnings
    }

    res.json({
      subscription: subscription
        ? {
            _id: subscription._id,
            status: subscription.status,
            plan: subscription.plan,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            contactLimit: contactLimit,
            contactsUsed: user.contactCount || 0,
          }
        : null,
      stats,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    res.status(500).json({ message: "Failed to get subscription status" });
  }
};
exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await safeFindOne(Subscription, {
      supplier: req.user.id,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({
        message: formatMessage("subscriptionNotFound", req.lang),
      });
    }

    subscription.status = "cancelled";
    await subscription.save();

    res.json({
      message: formatMessage("subscriptionCancelled", req.lang),
    });
  } catch (error) {
    res.status(500).json({
      message: formatMessage("subscriptionCancelFailed", req.lang),
    });
  }
};

exports.getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await safeFindOne(Subscription, {
      supplier: req.user.id,
      status: "active",
    });

    const user = await User.findById(req.user.id);
    const plan = subscription?.plan || "basic";
    const contactLimit =
      SUBSCRIPTION_PLANS[plan.toUpperCase()]?.contactLimit || 50;

    // Check if should warn using updated logic
    if (shouldWarnSupplier(user.contactCount || 0, contactLimit)) {
      const usagePercent = Math.round(
        ((user.contactCount || 0) / contactLimit) * 100
      );
      await sendWhatsAppNotification(
        user.phone,
        formatMessage(
          "subscriptionLimitNear",
          user.language || "ar",
          usagePercent
        )
      );
    }

    // Check if should lock using updated logic
    if (
      shouldLockSupplier(user.contactCount || 0, contactLimit) &&
      !user.isLocked
    ) {
      user.isLocked = true;
      user.lockReason = "Contact limit reached";
      await user.save();

      await sendWhatsAppNotification(
        user.phone,
        formatMessage("contactLimitReached", user.language || "ar")
      );
    }

    if (!subscription) {
      return res.json({
        status: "inactive",
        type: "basic",
        contactLimit: contactLimit,
        contactsUsed: user.contactCount || 0,
        startDate: null,
        expiryDate: null,
        autoRenew: false,
      });
    }

    res.json({
      _id: subscription._id,
      status: subscription.status,
      type: subscription.plan,
      contactLimit: contactLimit,
      contactsUsed: user.contactCount || 0,
      startDate: subscription.startDate,
      expiryDate: subscription.endDate,
      autoRenew: subscription.autoRenew,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({
      message: formatMessage("subscriptionFailed", req.user.language || "ar"),
    });
  }
};

// exports.getSubscriptionStats = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     const subscription = await Subscription.findOne({
//       supplier: req.user.id,
//       status: "active",
//     });

//     const plan = subscription?.plan || "basic";
//     const contactLimit =
//       SUBSCRIPTION_PLANS[plan.toUpperCase()]?.contactLimit || 50;
//     const usagePercentage = ((user.contactCount || 0) / contactLimit) * 100;
//     const daysUntilExpiry = subscription
//       ? Math.ceil(
//           (new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
//         )
//       : 0;

//     const stats = {
//       isLocked: user.isLocked,
//       lockReason: user.lockReason,
//       lockExpiryDate: user.lockExpiryDate,
//       usagePercentage,
//       daysUntilExpiry,
//       hasWarning: false,
//       warningType: undefined,
//       currentContacts: user.contactCount || 0,
//       maxContacts: contactLimit,
//     };

//     // Set warning type using updated logic
//     if (user.isLocked) {
//       stats.hasWarning = true;
//       stats.warningType = "locked";
//     } else if (shouldWarnSupplier(user.contactCount || 0, contactLimit)) {
//       stats.hasWarning = true;
//       stats.warningType = "near-limit";
//     } else if (daysUntilExpiry < 7) {
//       stats.hasWarning = true;
//       stats.warningType = "expiring";
//     }

//     res.json(stats);
//   } catch (error) {
//     console.error("Stats error:", error);
//     res.status(500).json({ message: "Failed to get subscription stats" });
//   }
// };

exports.renewSubscription = async (req, res) => {
  try {
    const { planType } = req.body;
    const user = await User.findById(req.user.id);

    // Validate plan
    if (!planType || !["basic", "premium", "enterprise"].includes(planType)) {
      return res.status(400).json({
        message: "Invalid plan. Must be 'basic', 'premium', or 'enterprise'",
      });
    }

    // Create new subscription with the requested plan
    const currentSubscription = await safeFindOne(Subscription, {
      supplier: req.user.id,
      status: "active",
    });

    const newSubscription = new Subscription({
      supplier: req.user.id,
      plan: planType,
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      autoRenew: currentSubscription?.autoRenew || false,
    });

    // Expire current subscription if exists
    if (currentSubscription) {
      currentSubscription.status = "expired";
      await currentSubscription.save();
    }

    await newSubscription.save();

    // Reset contact count on renewal
    user.contactCount = 0;
    user.isLocked = false;
    user.lockReason = undefined;
    user.lockExpiryDate = undefined;
    await user.save();

    // Send WhatsApp notification
    await sendWhatsAppNotification(
      user.phone,
      formatMessage("subscriptionRenewed", user.language || "ar")
    );

    const contactLimit =
      SUBSCRIPTION_PLANS[planType.toUpperCase()]?.contactLimit || 50;

    res.json({
      success: true,
      message: formatMessage("subscriptionRenewed", user.language || "ar"),
      subscription: {
        _id: newSubscription._id,
        status: newSubscription.status,
        type: newSubscription.plan,
        contactLimit: contactLimit,
        contactsUsed: 0,
        startDate: newSubscription.startDate,
        expiryDate: newSubscription.endDate,
        autoRenew: newSubscription.autoRenew,
      },
    });
  } catch (error) {
    console.error("Renewal error:", error);
    res.status(500).json({
      success: false,
      message: formatMessage("subscriptionFailed", req.user.language || "ar"),
    });
  }
};

exports.toggleAutoRenew = async (req, res) => {
  try {
    const subscription = await safeFindOne(Subscription, {
      supplier: req.user.id,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    subscription.autoRenew = !subscription.autoRenew;
    await subscription.save();

    res.json({ autoRenew: subscription.autoRenew });
  } catch (error) {
    console.error("Auto-renew toggle error:", error);
    res.status(500).json({ message: "Failed to toggle auto-renewal" });
  }
};

// New method to get available plans
exports.getAvailablePlans = async (req, res) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      type: plan.name,
      name: plan.name.charAt(0).toUpperCase() + plan.name.slice(1),
      price: plan.price,
      contactLimit: plan.contactLimit,
      duration: plan.duration,
      features: getPlanFeatures(plan.name),
    }));

    res.json(plans);
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ message: "Failed to get available plans" });
  }
};

function getPlanFeatures(planType) {
  const features = {
    basic: [
      "50 contact requests per month",
      "Basic support",
      "Standard features",
    ],
    premium: [
      "100 contact requests per month",
      "Priority support",
      "Advanced features",
      "Analytics dashboard",
    ],
    enterprise: [
      "500 contact requests per month",
      "24/7 support",
      "All features",
      "Advanced analytics",
      "Custom integrations",
    ],
  };

  return features[planType] || features.basic;
}
