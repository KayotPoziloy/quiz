const request = require("supertest");
const app = require("../src/app");

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

async function registerAndLogin(role = "organizer") {
  const email = uniqueEmail(role);
  const password = "secret123";

  await request(app)
    .post("/api/auth/register")
    .send({ email, password, role });

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return { token: login.body.token, email };
}

describe("Quiz API", () => {
  test("Auth required for quiz routes", async () => {
    const createRes = await request(app)
      .post("/api/quizzes")
      .send({ title: "My Quiz", time_per_question: 20 });
    expect(createRes.status).toBe(401);

    const listRes = await request(app).get("/api/quizzes");
    expect(listRes.status).toBe(401);
  });

  test("Create quiz", async () => {
    const { token } = await registerAndLogin("organizer");
    const res = await request(app)
      .post("/api/quizzes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Quiz", time_per_question: 20 });

    expect(res.status).toBe(201);
    expect(res.body.quiz).toBeDefined();
    expect(res.body.quiz).toHaveProperty("id");
  });

  test("Get quizzes", async () => {
    const { token } = await registerAndLogin("organizer");

    await request(app)
      .post("/api/quizzes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Quiz", time_per_question: 20 });

    const res = await request(app)
      .get("/api/quizzes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.quizzes)).toBe(true);
    expect(res.body.quizzes.length).toBeGreaterThan(0);
  });

  test("Get quiz by id", async () => {
    const { token } = await registerAndLogin("organizer");

    const created = await request(app)
      .post("/api/quizzes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Quiz", time_per_question: 20 });

    const quizId = created.body.quiz.id;

    const res = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz.id).toBe(quizId);
  });

  test("Delete quiz - only owner can delete", async () => {
    const owner = await registerAndLogin("organizer");
    const other = await registerAndLogin("organizer");

    const created = await request(app)
      .post("/api/quizzes")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "My Quiz", time_per_question: 20 });

    const quizId = created.body.quiz.id;

    const forbidden = await request(app)
      .delete(`/api/quizzes/${quizId}`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(forbidden.status).toBe(404);

    const ok = await request(app)
      .delete(`/api/quizzes/${quizId}`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(ok.status).toBe(200);
  });
});
