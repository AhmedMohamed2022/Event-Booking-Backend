const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const EventItem = require("../models/EventItem");
const Contact = require("../models/Contact");
const Subscription = require("../models/Subscription");
const {
  isContactOnlyCategory,
  shouldWarnSupplier,
  shouldLockSupplier,
  FREE_CONTACT_LIMIT,
  WARNING_THRESHOLD,
  CONTACT_ONLY_CATEGORIES,
} = require("../utils/subscription");

describe("Subscription and Contact System Logic", () => {
  let clientToken, supplierToken, adminToken;
  let client, supplier, eventItem;

  beforeAll(async () => {
    // Create test users
    client = await User.create({
      name: "Test Client",
      phone: "962791234567",
      role: "client",
    });

    supplier = await User.create({
      name: "Test Supplier",
      phone: "962798765432",
      role: "supplier",
    });

    // Create test event item (farm - contact only category)
    eventItem = await EventItem.create({
      name: "Test Farm",
      category: "farm",
      price: 1000,
      supplier: supplier._id,
      location: {
        city: "Amman",
        area: "Abdoun",
      },
    });

    // Generate tokens
    clientToken = require("jsonwebtoken").sign(
      { id: client._id, role: "client" },
      process.env.JWT_SECRET || "test-secret"
    );

    supplierToken = require("jsonwebtoken").sign(
      { id: supplier._id, role: "supplier" },
      process.env.JWT_SECRET || "test-secret"
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await EventItem.deleteMany({});
    await Contact.deleteMany({});
    await Subscription.deleteMany({});
    await mongoose.connection.close();
  });

  describe("Contact Only Categories", () => {
    test("should identify farm as contact-only category", () => {
      expect(isContactOnlyCategory("farm")).toBe(true);
      expect(isContactOnlyCategory("wedding-halls")).toBe(true);
      expect(isContactOnlyCategory("catering")).toBe(false);
      expect(isContactOnlyCategory("photography")).toBe(false);
    });

    test("should have correct contact-only categories defined", () => {
      expect(CONTACT_ONLY_CATEGORIES).toContain("farm");
      expect(CONTACT_ONLY_CATEGORIES).toContain("wedding-halls");
      expect(CONTACT_ONLY_CATEGORIES.length).toBe(2);
    });
  });

  describe("Contact Limit Logic", () => {
    test("should have correct constants", () => {
      expect(FREE_CONTACT_LIMIT).toBe(50);
      expect(WARNING_THRESHOLD).toBe(40);
    });

    test("should warn supplier at 40 contacts", () => {
      expect(shouldWarnSupplier(39)).toBe(false);
      expect(shouldWarnSupplier(40)).toBe(true);
      expect(shouldWarnSupplier(49)).toBe(true);
      expect(shouldWarnSupplier(50)).toBe(false); // At limit, should lock instead
    });

    test("should lock supplier at 50 contacts", () => {
      expect(shouldLockSupplier(49)).toBe(false);
      expect(shouldLockSupplier(50)).toBe(true);
      expect(shouldLockSupplier(51)).toBe(true);
      expect(shouldLockSupplier(100)).toBe(true);
    });

    test("should handle edge cases correctly", () => {
      expect(shouldWarnSupplier(0)).toBe(false);
      expect(shouldLockSupplier(0)).toBe(false);
      expect(shouldWarnSupplier(-1)).toBe(false);
      expect(shouldLockSupplier(-1)).toBe(false);
    });
  });

  describe("Business Logic Validation", () => {
    test("should enforce correct business flow", () => {
      // Supplier starts with 0 contacts
      expect(shouldWarnSupplier(0)).toBe(false);
      expect(shouldLockSupplier(0)).toBe(false);

      // At 39 contacts - still safe
      expect(shouldWarnSupplier(39)).toBe(false);
      expect(shouldLockSupplier(39)).toBe(false);

      // At 40 contacts - warning should trigger
      expect(shouldWarnSupplier(40)).toBe(true);
      expect(shouldLockSupplier(40)).toBe(false);

      // At 49 contacts - still warning, not locked
      expect(shouldWarnSupplier(49)).toBe(true);
      expect(shouldLockSupplier(49)).toBe(false);

      // At 50 contacts - should lock, no more warnings
      expect(shouldWarnSupplier(50)).toBe(false);
      expect(shouldLockSupplier(50)).toBe(true);

      // Beyond 50 - definitely locked
      expect(shouldWarnSupplier(51)).toBe(false);
      expect(shouldLockSupplier(51)).toBe(true);
    });
  });

  describe("Contact Request Flow", () => {
    test("should allow contact request for farm category", async () => {
      const response = await request(app)
        .post("/api/contact-request")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ eventItemId: eventItem._id });

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();
      expect(response.body.supplierPhone).toBe(supplier.phone);
    });

    test("should increment supplier contact count", async () => {
      const updatedSupplier = await User.findById(supplier._id);
      expect(updatedSupplier.contactCount).toBe(1);
    });

    test("should reject contact request for non-contact category", async () => {
      // Create non-contact event item
      const cateringItem = await EventItem.create({
        name: "Test Catering",
        category: "catering",
        price: 500,
        supplier: supplier._id,
      });

      const response = await request(app)
        .post("/api/contact-request")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({ eventItemId: cateringItem._id });

      expect(response.status).toBe(400);
    });
  });

  describe("Subscription Management", () => {
    test("should create subscription and unlock supplier", async () => {
      // Lock supplier first
      supplier.isLocked = true;
      supplier.contactCount = 50;
      await supplier.save();

      const response = await request(app)
        .post("/api/subscription")
        .set("Authorization", `Bearer ${supplierToken}`)
        .send({ plan: "basic" });

      expect(response.status).toBe(201);

      const updatedSupplier = await User.findById(supplier._id);
      expect(updatedSupplier.isLocked).toBe(false);
      expect(updatedSupplier.contactCount).toBe(0);
    });

    test("should get subscription status", async () => {
      const response = await request(app)
        .get("/api/subscription/status")
        .set("Authorization", `Bearer ${supplierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toBeDefined();
      expect(response.body.subscription.status).toBe("active");
    });
  });
});
