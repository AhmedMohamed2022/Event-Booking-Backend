const EventItem = require("../models/EventItem");
const { generateGoogleMapLinks } = require("../utils/googleMaps");
const cloudinary = require("../utils/cloudinary");

// exports.createEventItem = async (req, res) => {
//   try {
//     const item = await EventItem.create({ ...req.body, supplier: req.user.id });
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getAllEventItems = async (req, res) => {
  try {
    const items = await EventItem.find().populate("supplier", "name phone");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// exports.getEventItemById = async (req, res) => {
//   try {
//     const item = await EventItem.findById(req.params.id).populate("supplier");
//     if (!item) return res.status(404).json({ message: "Item not found" });
//     res.json(item);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getEventItemById = async (req, res) => {
  try {
    const item = await EventItem.findById(req.params.id).populate("supplier");
    if (!item) return res.status(404).json({ message: "Item not found" });

    const { lat, lng } = item.location.coordinates || {};
    const mapLinks = lat && lng ? generateGoogleMapLinks(lat, lng) : {};

    res.json({ ...item.toObject(), ...mapLinks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEventItem = async (req, res) => {
  try {
    // Sanitize incoming data similar to create
    const itemData = { ...req.body };

    if (itemData.availability) {
      if (itemData.availability.dateRange) {
        if (itemData.availability.dateRange.from)
          itemData.availability.dateRange.from = new Date(
            itemData.availability.dateRange.from
          );
        if (itemData.availability.dateRange.to)
          itemData.availability.dateRange.to = new Date(
            itemData.availability.dateRange.to
          );
      }

      if (Array.isArray(itemData.availability.excludedDates)) {
        itemData.availability.excludedDates =
          itemData.availability.excludedDates.map((d) => new Date(d));
      }
    }

    // If client sends legacy availableDates, coerce them to Date objects
    if (Array.isArray(itemData.availableDates)) {
      itemData.availableDates = itemData.availableDates.map((d) => new Date(d));
    }

    // Normalize subcategories on update: accept array or comma-separated string
    if (itemData.subcategories && !Array.isArray(itemData.subcategories)) {
      itemData.subcategories = String(itemData.subcategories)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Normalize social links
    if (itemData.social && typeof itemData.social === "object") {
      itemData.social = {
        instagram: itemData.social.instagram
          ? String(itemData.social.instagram).trim()
          : undefined,
        facebook: itemData.social.facebook
          ? String(itemData.social.facebook).trim()
          : undefined,
      };
    }

    // Preserve legacy single subcategory for compatibility if not explicitly provided
    if (
      !itemData.subcategory &&
      Array.isArray(itemData.subcategories) &&
      itemData.subcategories.length > 0
    ) {
      itemData.subcategory = itemData.subcategories[0];
    }

    // Normalize price handling: allow missing price for contact-only services
    if (
      itemData.price === undefined ||
      itemData.price === null ||
      itemData.price === ""
    ) {
      itemData.price = undefined;
      itemData.priceType = itemData.priceType || "not_provided";
      itemData.priceAvailable = false;
    } else {
      // ensure numeric
      itemData.price = Number(itemData.price);
      itemData.priceAvailable = true;
    }

    // Derive priceAvailable: false when price is null/undefined or explicitly not_provided
    if (itemData.price === undefined || itemData.price === null) {
      // If priceType provided and set to not_provided, respect it; otherwise default to not_provided
      itemData.priceType = itemData.priceType || "not_provided";
      itemData.priceAvailable = false;
    } else {
      itemData.priceAvailable = true;
      // If supplier marked as free explicitly
      if (itemData.priceType === "free") itemData.price = 0;
    }

    const item = await EventItem.findByIdAndUpdate(req.params.id, itemData, {
      new: true,
    });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEventItem = async (req, res) => {
  try {
    await EventItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// exports.searchEventItems = async (req, res) => {
//   try {
//     const { city, area, category, people, date } = req.query;

//     const query = {};

//     // 🔍 Location filters (optional)
//     if (city) query["location.city"] = city;
//     if (area) query["location.area"] = area;

//     // 🔍 Category (e.g. Wedding, Funeral)
//     if (category) query.category = category;

//     // 🔍 Number of People (e.g. 150 → between min & max)
//     if (people) {
//       const count = parseInt(people);
//       query.minCapacity = { $lte: count };
//       query.maxCapacity = { $gte: count };
//     }

//     // 🔍 Event Date Availability
//     if (date) {
//       const searchDate = new Date(date);
//       query.availableDates = { $in: [searchDate] };
//     }

//     // 🔍 Perform search with supplier info
//     const results = await EventItem.find(query).populate(
//       "supplier",
//       "name phone"
//     );

//     res.json(results);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Search failed" });
//   }
// };
// exports.searchEventItems = async (req, res) => {
//   try {
//     const {
//       city,
//       area,
//       category,
//       date,
//       people,
//       subcategory, // new optional
//       minPrice,
//       maxPrice,
//     } = req.query;

//     const query = {};

//     if (city) query["location.city"] = city;
//     if (area) query["location.area"] = area;
//     if (category) query.category = category;
//     if (subcategory) query.subcategory = subcategory; // optional in future

//     if (people) {
//       const count = parseInt(people);
//       query.minCapacity = { $lte: count };
//       query.maxCapacity = { $gte: count };
//     }

//     if (date) {
//       query.availableDates = { $in: [new Date(date)] };
//     }

//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = parseInt(minPrice);
//       if (maxPrice) query.price.$lte = parseInt(maxPrice);
//     }

//     const results = await EventItem.find(query)
//       .populate("supplier", "name phone")
//       .sort({ createdAt: -1 });

//     res.json(results);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Search failed" });
//   }
// };
exports.searchEventItems = async (req, res) => {
  try {
    const {
      city,
      area,
      category,
      date,
      people,
      subcategory,
      minPrice,
      maxPrice,
    } = req.query;

    const query = {};

    if (city) query["location.city"] = city;
    if (area) query["location.area"] = area;
    if (category) query.category = category;
    // Support querying by subcategory name or by multiple subcategories.
    // `subcategory` query may be a single value or comma-separated list.
    if (subcategory) {
      const subs = Array.isArray(subcategory)
        ? subcategory
        : String(subcategory)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      // Match documents where any of the stored `subcategories` contains one of the requested values
      // or where legacy `subcategory` equals one of the requested values.
      query.$or = [
        { subcategories: { $in: subs } },
        { subcategory: { $in: subs } },
      ];
    }

    if (people) {
      const count = parseInt(people);
      query.minCapacity = { $lte: count };
      query.maxCapacity = { $gte: count };
    }

    // Updated date availability check
    if (date) {
      const searchDate = new Date(date);
      query.$or = [
        // Check old availableDates array
        { availableDates: { $in: [searchDate] } },
        // Check new date range
        {
          $and: [
            { "availability.dateRange.from": { $lte: searchDate } },
            { "availability.dateRange.to": { $gte: searchDate } },
            {
              $or: [
                { "availability.excludedDates": { $exists: false } },
                { "availability.excludedDates": { $nin: [searchDate] } },
              ],
            },
          ],
        },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    const results = await EventItem.find(query)
      .populate("supplier", "name phone")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

// Update create method to handle the new availability format
exports.createEventItem = async (req, res) => {
  try {
    const itemData = { ...req.body, supplier: req.user.id };

    // Ensure dates are properly formatted
    if (itemData.availability) {
      if (itemData.availability.dateRange) {
        // Only coerce when values are present
        if (itemData.availability.dateRange.from)
          itemData.availability.dateRange.from = new Date(
            itemData.availability.dateRange.from
          );
        if (itemData.availability.dateRange.to)
          itemData.availability.dateRange.to = new Date(
            itemData.availability.dateRange.to
          );
      }

      if (Array.isArray(itemData.availability.excludedDates)) {
        itemData.availability.excludedDates =
          itemData.availability.excludedDates.map((date) => new Date(date));
      }
    }

    // Normalize subcategories: accept array or comma-separated string
    if (itemData.subcategories && !Array.isArray(itemData.subcategories)) {
      itemData.subcategories = String(itemData.subcategories)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Allow optional social links
    if (itemData.social && typeof itemData.social === "object") {
      itemData.social = {
        instagram: itemData.social.instagram
          ? String(itemData.social.instagram).trim()
          : undefined,
        facebook: itemData.social.facebook
          ? String(itemData.social.facebook).trim()
          : undefined,
      };
    }

    // Preserve legacy single subcategory for compatibility if not explicitly provided
    if (
      !itemData.subcategory &&
      Array.isArray(itemData.subcategories) &&
      itemData.subcategories.length > 0
    ) {
      itemData.subcategory = itemData.subcategories[0];
    }

    const item = await EventItem.create(itemData);
    res.status(201).json(item);
  } catch (err) {
    console.error("Error creating event item:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.subFilterEventItems = async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const query = {};

    if (category) query.category = category;
    if (subcategory) {
      const subs = Array.isArray(subcategory)
        ? subcategory
        : String(subcategory)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      query.$or = [
        { subcategories: { $in: subs } },
        { subcategory: { $in: subs } },
      ];
    }

    const results = await EventItem.find(query).populate(
      "supplier",
      "name phone"
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Sub-filtering failed" });
  }
};

exports.uploadEventMedia = async (req, res) => {
  try {
    const itemId = req.params.id;

    // Check if any files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Get existing item
    const existingItem = await EventItem.findById(itemId);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Process all uploads
    const allFiles = [
      ...(req.files.images || []).map((file) => ({ file, type: "image" })),
      ...(req.files.videos || []).map((file) => ({ file, type: "video" })),
    ];

    const uploadPromises = allFiles.map(({ file, type }) => {
      return new Promise((resolve, reject) => {
        const filename = `${Date.now()}-${file.originalname.replace(
          /\s+/g,
          "-"
        )}`;

        const uploadOptions = {
          folder: "event_items",
          resource_type: type,
          public_id: filename,
          unique_filename: true,
          ...(type === "video"
            ? {
                eager: [{ width: 720, crop: "scale" }, { quality: "auto" }],
              }
            : {
                transformation: [
                  { width: 1200, crop: "limit" },
                  { fetch_format: "auto", quality: "auto" },
                ],
              }),
        };

        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              originalName: file.originalname,
              type,
            });
          }
        );
        stream.end(file.buffer);
      });
    });

    const uploads = await Promise.all(uploadPromises);

    // Separate and combine with existing media
    const newImages = uploads
      .filter((upload) => upload.type === "image")
      .map((upload) => upload.url);

    const newVideos = uploads
      .filter((upload) => upload.type === "video")
      .map((upload) => upload.url);

    const updatedImages = [...(existingItem.images || []), ...newImages];
    const updatedVideos = [...(existingItem.videos || []), ...newVideos];

    // Update the item
    const item = await EventItem.findByIdAndUpdate(
      itemId,
      {
        images: updatedImages,
        videos: updatedVideos,
      },
      { new: true }
    );

    res.json({
      message: "Media uploaded successfully",
      images: item.images,
      videos: item.videos,
      cloudinaryRefs: uploads,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Media upload failed" });
  }
};
