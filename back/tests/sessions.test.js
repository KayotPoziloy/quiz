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

  return { token: login.body.token };
}

async function createQuiz(token) {
  const res = await request(app)
    .post("/api/quizzes")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "My Quiz", time_per_question: 20 });

  return res.body.quiz.id;
}

describe("Session API", () => {
  test("Create session", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const res = await request(app)
      .post("/api/sessions/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ quizId });

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session).toHaveProperty("room_code");
  });

  test("Join session", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const created = await request(app)
      .post("/api/sessions/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ quizId });

    const roomCode = created.body.session.room_code;

    const res = await request(app)
      .post("/api/sessions/join")
      .send({ roomCode, nickname: "Player1" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("playerSessionId");
  });

  test("Start session", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const created = await request(app)
      .post("/api/sessions/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ quizId });

    const sessionId = created.body.session.id;

    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe("active");
  });

  test("Invalid room code", async () => {
    const res = await request(app)
      .post("/api/sessions/join")
      .send({ roomCode: "BAD123", nickname: "Player1" });

    expect(res.status).toBe(404);
  });

  test("Starting already active session", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const created = await request(app)
      .post("/api/sessions/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ quizId });

    const sessionId = created.body.session.id;

    await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId });

    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ sessionId });

    expect(res.status).toBe(400);
  });
});
