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

describe("Question creation", () => {
  test("Valid request", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        quizId,
        text: "2+2?",
        type: "single",
        answers: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question).toBeDefined();
    expect(Array.isArray(res.body.answers)).toBe(true);
  });

  test("No correct answers should fail", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        quizId,
        text: "2+2?",
        type: "single",
        answers: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: false },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test("Multiple correct answers (multiple type)", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);

    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        quizId,
        text: "Select primes",
        type: "multiple",
        answers: [
          { text: "2", isCorrect: true },
          { text: "3", isCorrect: true },
          { text: "4", isCorrect: false },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question).toBeDefined();
    expect(res.body.answers.length).toBe(3);
  });
});
