const Wishlist = require("../models/Wishlist");
const EventItem = require("../models/EventItem");

// Add or remove service from wishlist
exports.toggleWishlist = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const userId = req.user.id;

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    // Verify service exists
    const service = await EventItem.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Get or create user's wishlist
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, services: [] });
    }

    // Check if service is already in wishlist
    const serviceIndex = wishlist.services.findIndex(
      (id) => id.toString() === serviceId
    );

    if (serviceIndex > -1) {
      // Remove from wishlist
      wishlist.services.splice(serviceIndex, 1);
      await wishlist.save();
      res.json({ added: false, message: "Service removed from wishlist" });
    } else {
      // Add to wishlist
      wishlist.services.push(serviceId);
      await wishlist.save();
      res.json({ added: true, message: "Service added to wishlist" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
};

// Get user's wishlist with populated service details
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "services",
      populate: { path: "supplier", select: "name phone" },
    });

    if (!wishlist) {
      return res.json({ services: [] });
    }

    res.json({ services: wishlist.services || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
};

// Check if a service is in user's wishlist
exports.checkWishlistStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId });
    const isInWishlist = wishlist?.services.some(
      (id) => id.toString() === serviceId
    );

    res.json({ inWishlist: !!isInWishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check wishlist status" });
  }
};

// Get wishlist status for multiple services
exports.checkWishlistStatuses = async (req, res) => {
  try {
    const { serviceIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ error: "Service IDs array is required" });
    }

    const wishlist = await Wishlist.findOne({ user: userId });
    const wishedServices = new Set(
      wishlist?.services.map((id) => id.toString()) || []
    );

    const statuses = {};
    serviceIds.forEach((id) => {
      statuses[id] = wishedServices.has(id);
    });

    res.json(statuses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check wishlist statuses" });
  }
};

// Add service to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const userId = req.user.id;

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const service = await EventItem.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, services: [serviceId] });
    } else {
      if (!wishlist.services.includes(serviceId)) {
        wishlist.services.push(serviceId);
      }
    }

    await wishlist.save();
    res.json({ message: "Service added to wishlist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
};

// Remove service from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    wishlist.services = wishlist.services.filter(
      (id) => id.toString() !== serviceId
    );
    await wishlist.save();

    res.json({ message: "Service removed from wishlist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from wishlist" });
  }
};
