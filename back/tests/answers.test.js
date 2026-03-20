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

async function createQuestion(token, quizId) {
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

  return {
    questionId: res.body.question.id,
    answers: res.body.answers,
  };
}

async function createSession(token, quizId) {
  const res = await request(app)
    .post("/api/sessions/create")
    .set("Authorization", `Bearer ${token}`)
    .send({ quizId });

  return res.body.session;
}

async function joinSession(roomCode) {
  const res = await request(app)
    .post("/api/sessions/join")
    .send({ roomCode, nickname: "Player1" });

  return res.body.playerSessionId;
}

describe("Answer submission", () => {
  test("Correct answer -> score increases", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);
    const { questionId, answers } = await createQuestion(token, quizId);
    const session = await createSession(token, quizId);
    const playerSessionId = await joinSession(session.room_code);

    const correctId = answers.find((a) => a.is_correct).id;

    const submit = await request(app)
      .post("/api/answers/submit")
      .send({
        playerSessionId,
        questionId,
        answerIds: [correctId],
      });

    expect(submit.status).toBe(200);
    expect(submit.body.isCorrect).toBe(true);
    expect(submit.body.scoreAwarded).toBe(100);
  });

  test("Wrong answer -> no score", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);
    const { questionId, answers } = await createQuestion(token, quizId);
    const session = await createSession(token, quizId);
    const playerSessionId = await joinSession(session.room_code);

    const wrongId = answers.find((a) => !a.is_correct).id;

    const submit = await request(app)
      .post("/api/answers/submit")
      .send({
        playerSessionId,
        questionId,
        answerIds: [wrongId],
      });

    expect(submit.status).toBe(200);
    expect(submit.body.isCorrect).toBe(false);
    expect(submit.body.scoreAwarded).toBe(0);
  });

  test("Duplicate answer -> rejected", async () => {
    const { token } = await registerAndLogin("organizer");
    const quizId = await createQuiz(token);
    const { questionId, answers } = await createQuestion(token, quizId);
    const session = await createSession(token, quizId);
    const playerSessionId = await joinSession(session.room_code);

    const correctId = answers.find((a) => a.is_correct).id;

    await request(app)
      .post("/api/answers/submit")
      .send({
        playerSessionId,
        questionId,
        answerIds: [correctId],
      });

    const submit = await request(app)
      .post("/api/answers/submit")
      .send({
        playerSessionId,
        questionId,
        answerIds: [correctId],
      });

    expect(submit.status).toBe(409);
  });
});
