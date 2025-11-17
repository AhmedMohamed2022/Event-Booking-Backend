const ratingController = require("../controllers/ratingController");

// Mock models used inside the controller
jest.mock("../models/Rating", () => ({
  findOneAndUpdate: jest.fn(),
  aggregate: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("../models/EventItem", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock("../models/Booking", () => ({ exists: jest.fn() }));
jest.mock("../models/ContactRequest", () => ({ exists: jest.fn() }));

const Rating = require("../models/Rating");
const EventItem = require("../models/EventItem");
const Booking = require("../models/Booking");
const ContactRequest = require("../models/ContactRequest");

// Helper to create mock req/res
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("ratingController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkEligibility", () => {
    test("returns eligible false when no user", async () => {
      const req = { user: null, params: { id: "svc1" } };
      const res = mockRes();

      await ratingController.checkEligibility(req, res);
      expect(res.json).toHaveBeenCalledWith({ eligible: false });
    });

    test("returns eligible true when Booking.exists returns true", async () => {
      Booking.exists.mockResolvedValue(true);
      const req = { user: { _id: "u1" }, params: { id: "svc1" } };
      const res = mockRes();

      await ratingController.checkEligibility(req, res);
      expect(res.json).toHaveBeenCalledWith({ eligible: true });
    });

    test("returns eligible true when ContactRequest exists", async () => {
      Booking.exists.mockResolvedValue(false);
      ContactRequest.exists.mockResolvedValue(true);
      const req = { user: { _id: "u2" }, params: { id: "svc2" } };
      const res = mockRes();

      await ratingController.checkEligibility(req, res);
      expect(res.json).toHaveBeenCalledWith({ eligible: true });
    });
  });

  describe("getMyRating", () => {
    test("returns 401 when unauthenticated", async () => {
      const req = { user: null, params: { id: "svc1" } };
      const res = mockRes();
      await ratingController.getMyRating(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Authentication required",
      });
    });

    test("returns null rating when none found", async () => {
      Rating.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      const req = { user: { _id: "u1" }, params: { id: "svc1" } };
      const res = mockRes();
      await ratingController.getMyRating(req, res);
      expect(res.json).toHaveBeenCalledWith({ rating: null });
    });

    test("returns rating when found", async () => {
      const mockRating = { score: 5, comment: "Great" };
      Rating.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockRating),
      });
      const req = { user: { _id: "u1" }, params: { id: "svc1" } };
      const res = mockRes();
      await ratingController.getMyRating(req, res);
      expect(res.json).toHaveBeenCalledWith({ rating: mockRating });
    });
  });

  describe("createOrUpdateRating validations", () => {
    test("rejects invalid score", async () => {
      const req = {
        user: { _id: "u1" },
        params: { id: "svc1" },
        body: { score: 10 },
      };
      const res = mockRes();
      await ratingController.createOrUpdateRating(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Score must be integer between 1 and 5",
      });
    });

    test("rejects when not eligible", async () => {
      Booking.exists.mockResolvedValue(false);
      ContactRequest.exists.mockResolvedValue(false);
      const req = {
        user: { _id: "u1" },
        params: { id: "svc1" },
        body: { score: 4, comment: "ok" },
      };
      const res = mockRes();
      await ratingController.createOrUpdateRating(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
