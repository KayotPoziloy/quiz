const request = require("supertest");
const app = require("../src/app");

describe("Auth API", () => {
  const registerEmail = `user_${Date.now()}@test.com`;
  const loginEmail = `login_${Date.now()}@test.com`;
  const password = "secret123";

  test("POST /auth/register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: registerEmail, password, role: "player" });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(registerEmail);
    expect(res.body.user).toHaveProperty("id");
  });

  test("POST /auth/login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: loginEmail, password, role: "organizer" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: loginEmail, password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
  });
});

describe("Protected routes", () => {
  test("GET /quizzes without token should fail", async () => {
    const res = await request(app).get("/api/quizzes");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });
});
