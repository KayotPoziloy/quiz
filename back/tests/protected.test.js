jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

jest.mock("../src/services/quizService", () => ({
  getUserQuizzes: jest.fn().mockResolvedValue([]),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");

describe("Protected route with mocked JWT", () => {
  test("GET /quizzes with mocked token", async () => {
    jwt.verify.mockReturnValue({ userId: "test-user", role: "organizer" });

    const res = await request(app)
      .get("/api/quizzes")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quizzes");
  });
});
