const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { formatMessage } = require('./messages');
const { addDays } = require('date-fns');
const sendWhatsAppNotification = require('./whatsapp');

// Check subscriptions daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running subscription checks...');

    // Check for expiring subscriptions (7 days warning)
    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: new Date(),
        $lte: addDays(new Date(), 7)
      }
    }).populate('supplier');

    // Send expiry warnings
    for (const sub of expiringSubscriptions) {
      const daysLeft = Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      await sendWhatsAppNotification(
        sub.supplier.phone,
        formatMessage('subscriptionExpiring', sub.supplier.language || 'ar', daysLeft)
      );
    }

    // Handle expired subscriptions
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lt: new Date() }
    }).populate('supplier');

    for (const sub of expiredSubscriptions) {
      // Mark subscription as expired
      sub.status = 'expired';
      await sub.save();

      // Handle auto-renewal if enabled
      if (sub.autoRenew) {
        const newSubscription = new Subscription({
          supplier: sub.supplier._id,
          plan: sub.plan,
          startDate: new Date(),
          endDate: addDays(new Date(), 30),
          autoRenew: true
        });
        await newSubscription.save();
        
        // Reset supplier contact count
        await User.findByIdAndUpdate(sub.supplier._id, {
          $set: { contactCount: 0, isLocked: false }
        });

        await sendWhatsAppNotification(
          sub.supplier.phone,
          formatMessage('subscriptionRenewed', sub.supplier.language || 'ar')
        );
      } else {
        // Lock supplier if no auto-renewal
        await User.findByIdAndUpdate(sub.supplier._id, {
          $set: { isLocked: true }
        });

        await sendWhatsAppNotification(
          sub.supplier.phone,
          formatMessage('subscriptionExpired', sub.supplier.language || 'ar')
        );
      }
    }
  } catch (error) {
    console.error('Subscription cron job error:', error);
  }
});