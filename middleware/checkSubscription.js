const User = require("../models/User");
const Subscription = require("../models/Subscription");
const {
  SUBSCRIPTION_PLANS,
  shouldLockSupplier,
} = require("../utils/subscription");
const { formatMessage } = require("../utils/messages");

const checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const subscription = await Subscription.findOne({
      supplier: req.user.id,
      status: "active",
    });

    if (!subscription || new Date() > new Date(subscription.endDate)) {
      return res.status(403).json({
        message: formatMessage("subscriptionRequired", user.language || "ar"),
      });
    }

    const plan = subscription.plan;
    const contactLimit = SUBSCRIPTION_PLANS[plan.toUpperCase()].contactLimit;

    if (shouldLockSupplier(user.contactCount)) {
      user.isLocked = true;
      user.lockReason = formatMessage(
        "contactLimitReached",
        user.language || "ar"
      );
      await user.save();

      return res.status(403).json({
        message: formatMessage("supplierLocked", user.language || "ar"),
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      message: formatMessage("subscriptionFailed", req.user?.language || "ar"),
    });
  }
};

module.exports = checkSubscription;
