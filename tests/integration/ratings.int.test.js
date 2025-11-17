const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");

let app;
let mongoServer;

const User = require("../../models/User");
const EventItem = require("../../models/EventItem");
const Rating = require("../../models/Rating");

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // set a test JWT secret
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";

  // require the app after mongoose connection
  app = require("../../app");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Ratings integration", () => {
  let user;
  let token;
  let service;

  beforeEach(async () => {
    await User.deleteMany({});
    await EventItem.deleteMany({});
    await Rating.deleteMany({});

    user = await User.create({
      name: "Test User",
      phone: "+96550000001",
      role: "client",
    });
    service = await EventItem.create({
      name: "Test Service",
      category: "halls",
      supplier: user._id,
      availability: {
        dateRange: {
          from: new Date(),
          to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // create a rating by user
    await Rating.create({
      service: service._id,
      user: user._id,
      score: 5,
      comment: "Excellent",
    });

    // update denormalized fields on service (simulate controller behavior)
    await EventItem.findByIdAndUpdate(service._id, {
      averageRating: 5,
      ratingCount: 1,
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  });

  test("GET /api/event-items/:id/ratings/list returns ratings", async () => {
    const res = await request(app)
      .get(`/api/event-items/${service._id}/ratings/list`)
      .expect(200);

    expect(res.body).toHaveProperty("ratings");
    expect(Array.isArray(res.body.ratings)).toBe(true);
    expect(res.body.ratings.length).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/event-items/:id/ratings/my returns current user rating when authenticated", async () => {
    const res = await request(app)
      .get(`/api/event-items/${service._id}/ratings/my`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty("rating");
    expect(res.body.rating).not.toBeNull();
    expect(res.body.rating.score).toBe(5);
  });
});
