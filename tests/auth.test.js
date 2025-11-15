const request = require("supertest");
const app = require("../app"); // Adjust the path as necessary
const User = require("../models/User"); // Adjust the path as necessary

describe("Authentication Tests", () => {
  beforeAll(async () => {
    // Setup code, e.g., connecting to the database
  });

  afterAll(async () => {
    // Cleanup code, e.g., closing the database connection
  });

  it("should register a new user", async () => {
    const response = await request(app)
      .post("/api/auth/register") // Adjust the route as necessary
      .send({
        username: "testuser",
        password: "testpassword",
        email: "testuser@example.com",
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
  });

  it("should login an existing user", async () => {
    const response = await request(app)
      .post("/api/auth/login") // Adjust the route as necessary
      .send({
        username: "testuser",
        password: "testpassword",
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("should fail to login with incorrect credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login") // Adjust the route as necessary
      .send({
        username: "wronguser",
        password: "wrongpassword",
      });
    expect(response.status).toBe(401);
  });
});
