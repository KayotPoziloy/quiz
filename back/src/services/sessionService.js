const prisma = require("./prismaClient");

const ROOM_CODE_LENGTH = 6;
// Avoid ambiguous characters like I, O, 0, 1 for readability.
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function validateCreateSessionInput({ quizId }) {
  if (!quizId || typeof quizId !== "string") {
    const err = new Error("quizId is required");
    err.status = 400;
    throw err;
  }

  return { quizId };
}

function validateJoinSessionInput({ roomCode, nickname }) {
  if (!roomCode || typeof roomCode !== "string") {
    const err = new Error("roomCode is required");
    err.status = 400;
    throw err;
  }

  if (!nickname || typeof nickname !== "string" || !nickname.trim()) {
    const err = new Error("nickname is required");
    err.status = 400;
    throw err;
  }

  return { roomCode: roomCode.trim().toUpperCase(), nickname: nickname.trim() };
}

function validateStartSessionInput({ sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  return { sessionId };
}

function validateLeaderboardInput({ sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  return { sessionId };
}

function generateRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[idx];
  }
  return code;
}

async function createUniqueRoomCode(maxAttempts = 10) {
  // Retry a few times to avoid rare collisions.
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateRoomCode();
    const existing = await prisma.session.findUnique({
      where: { room_code: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }

  const err = new Error("Failed to generate unique room code");
  err.status = 500;
  throw err;
}

async function createSession({ userId, quizId }) {
  const validated = validateCreateSessionInput({ quizId });

  // Only the quiz owner can create a session.
  const quiz = await prisma.quiz.findFirst({
    where: { id: validated.quizId, creator_id: userId },
    select: { id: true },
  });

  if (!quiz) {
    const err = new Error("Quiz not found");
    err.status = 404;
    throw err;
  }

  const roomCode = await createUniqueRoomCode();

  const session = await prisma.session.create({
    data: {
      quiz_id: validated.quizId,
      room_code: roomCode,
      status: "waiting",
      current_question_index: 0,
      started_at: null,
    },
    select: {
      id: true,
      quiz_id: true,
      room_code: true,
      status: true,
      current_question_index: true,
      started_at: true,
    },
  });

  return session;
}

async function joinSession({ roomCode, nickname, userId }) {
  const validated = validateJoinSessionInput({ roomCode, nickname });

  // Room code uniquely identifies a session.
  const session = await prisma.session.findUnique({
    where: { room_code: validated.roomCode },
    select: {
      id: true,
      status: true,
      room_code: true,
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  if (session.status === "finished") {
    const err = new Error("Session is finished");
    err.status = 400;
    throw err;
  }

  // Allow anonymous users by leaving user_id null.
  const playerSession = await prisma.playerSession.create({
    data: {
      session_id: session.id,
      user_id: userId || null,
      nickname: validated.nickname,
    },
    select: {
      id: true,
      session_id: true,
      user_id: true,
      nickname: true,
      score: true,
      joined_at: true,
    },
  });

  return { session, playerSession };
}

async function startSession({ userId, userRole, sessionId }) {
  if (userRole !== "organizer") {
    const err = new Error("Only organizer can start session");
    err.status = 403;
    throw err;
  }

  const validated = validateStartSessionInput({ sessionId });

  const session = await prisma.session.findFirst({
    where: { id: validated.sessionId },
    select: {
      id: true,
      status: true,
      quiz: { select: { creator_id: true } },
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  if (session.quiz.creator_id !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  // Enforce status transition: waiting -> active.
  if (session.status !== "waiting") {
    const err = new Error("Session cannot be started");
    err.status = 400;
    throw err;
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      status: "active",
      started_at: new Date(),
    },
    select: {
      id: true,
      quiz_id: true,
      room_code: true,
      status: true,
      current_question_index: true,
      started_at: true,
    },
  });

  return updated;
}

async function getLeaderboard({ sessionId }) {
  const validated = validateLeaderboardInput({ sessionId });

  const session = await prisma.session.findUnique({
    where: { id: validated.sessionId },
    select: { id: true },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  const players = await prisma.playerSession.findMany({
    where: { session_id: validated.sessionId },
    orderBy: { score: "desc" },
    select: {
      id: true,
      nickname: true,
      score: true,
    },
  });

  return players;
}

async function getCurrentQuestion({ sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      current_question_index: true,
      quiz_id: true,
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  if (session.status !== "active") {
    const err = new Error("Session is not active");
    err.status = 400;
    throw err;
  }

  if (!session.current_question_index || session.current_question_index <= 0) {
    return { question: null };
  }

  const question = await prisma.question.findFirst({
    where: {
      quiz_id: session.quiz_id,
      order_index: session.current_question_index,
    },
    select: {
      id: true,
      quiz_id: true,
      text: true,
      image_url: true,
      type: true,
      order_index: true,
      answers: {
        select: {
          id: true,
          question_id: true,
          text: true,
        },
      },
    },
  });

  return { question };
}

async function nextQuestion({ userId, userRole, sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  if (userRole !== "organizer") {
    const err = new Error("Only organizer can advance questions");
    err.status = 403;
    throw err;
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      current_question_index: true,
      quiz: { select: { creator_id: true } },
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  if (session.quiz.creator_id !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  if (session.status !== "active") {
    const err = new Error("Session is not active");
    err.status = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: session.id },
      data: { current_question_index: { increment: 1 } },
      select: {
        id: true,
        current_question_index: true,
        quiz_id: true,
      },
    });

    const question = await tx.question.findFirst({
      where: {
        quiz_id: updated.quiz_id,
        order_index: updated.current_question_index,
      },
      select: {
        id: true,
        quiz_id: true,
        text: true,
        image_url: true,
        type: true,
        order_index: true,
        answers: {
          select: {
            id: true,
            question_id: true,
            text: true,
          },
        },
      },
    });

    return { question };
  });

  return result;
}

async function endSession({ userId, userRole, sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  if (userRole !== "organizer") {
    const err = new Error("Only organizer can end session");
    err.status = 403;
    throw err;
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      quiz: { select: { creator_id: true } },
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  if (session.quiz.creator_id !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { status: "finished" },
    select: { id: true, status: true },
  });

  const players = await prisma.playerSession.findMany({
    where: { session_id: session.id },
    orderBy: { score: "desc" },
    select: { id: true, nickname: true, score: true },
  });

  return { session: updated, leaderboard: players };
}

async function getSessionById({ sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required");
    err.status = 400;
    throw err;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      quiz_id: true,
      current_question_index: true,
      room_code: true,
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  return session;
}

async function getSessionByCode({ roomCode }) {
  if (!roomCode || typeof roomCode !== "string") {
    const err = new Error("roomCode is required");
    err.status = 400;
    throw err;
  }

  const session = await prisma.session.findUnique({
    where: { room_code: roomCode.trim().toUpperCase() },
    select: {
      id: true,
      status: true,
      quiz_id: true,
      current_question_index: true,
      room_code: true,
    },
  });

  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  return session;
}

module.exports = {
  createSession,
  joinSession,
  startSession,
  getLeaderboard,
  getCurrentQuestion,
  nextQuestion,
  endSession,
  getSessionById,
  getSessionByCode,
};
