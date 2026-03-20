const prisma = require("./prismaClient");

function validateQuizInput({ title, time_per_question }) {
  // Basic input guardrails to avoid invalid data at the DB layer.
  if (!title || typeof title !== "string" || !title.trim()) {
    const err = new Error("Title is required");
    err.status = 400;
    throw err;
  }

  const time = Number(time_per_question);
  if (!Number.isInteger(time) || time <= 0) {
    const err = new Error("time_per_question must be a positive integer");
    err.status = 400;
    throw err;
  }

  return { title: title.trim(), time_per_question: time };
}

async function createQuiz({ userId, data }) {
  const validated = validateQuizInput(data);

  // Only the authenticated user can be the creator.
  const quiz = await prisma.quiz.create({
    data: {
      title: validated.title,
      time_per_question: validated.time_per_question,
      creator_id: userId,
    },
    select: {
      id: true,
      title: true,
      creator_id: true,
      time_per_question: true,
      created_at: true,
    },
  });

  return quiz;
}

async function getUserQuizzes(userId) {
  // Return only quizzes created by the current user.
  const quizzes = await prisma.quiz.findMany({
    where: { creator_id: userId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      creator_id: true,
      time_per_question: true,
      created_at: true,
    },
  });

  return quizzes;
}

async function getUserQuizById({ userId, quizId }) {
  // Ensure the quiz belongs to the user.
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      creator_id: userId,
    },
    select: {
      id: true,
      title: true,
      creator_id: true,
      time_per_question: true,
      created_at: true,
    },
  });

  if (!quiz) {
    const err = new Error("Quiz not found");
    err.status = 404;
    throw err;
  }

  return quiz;
}

async function deleteUserQuiz({ userId, quizId }) {
  // Verify ownership before deleting.
  const existing = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      creator_id: userId,
    },
    select: { id: true },
  });

  if (!existing) {
    const err = new Error("Quiz not found");
    err.status = 404;
    throw err;
  }

  await prisma.quiz.delete({
    where: { id: quizId },
  });

  return { id: quizId };
}

module.exports = {
  createQuiz,
  getUserQuizzes,
  getUserQuizById,
  deleteUserQuiz,
};
