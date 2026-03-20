const prisma = require("./prismaClient");

function validateQuestionInput({ quizId, text, type, answers }) {
  // Validate required fields before hitting the database.
  if (!quizId || typeof quizId !== "string") {
    const err = new Error("quizId is required");
    err.status = 400;
    throw err;
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    const err = new Error("text is required");
    err.status = 400;
    throw err;
  }

  if (type !== "single" && type !== "multiple") {
    const err = new Error("type must be 'single' or 'multiple'");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    const err = new Error("answers must be a non-empty array");
    err.status = 400;
    throw err;
  }

  const hasCorrect = answers.some((a) => a && a.isCorrect === true);
  if (!hasCorrect) {
    const err = new Error("At least one correct answer is required");
    err.status = 400;
    throw err;
  }

  const normalizedAnswers = answers.map((a, idx) => {
    if (!a || typeof a.text !== "string" || !a.text.trim()) {
      const err = new Error(`Answer text is required (index ${idx})`);
      err.status = 400;
      throw err;
    }
    return {
      text: a.text.trim(),
      is_correct: Boolean(a.isCorrect),
    };
  });

  return {
    quizId,
    text: text.trim(),
    type,
    answers: normalizedAnswers,
  };
}

async function createQuestionWithAnswers({ userId, data }) {
  const validated = validateQuestionInput(data);

  // Ensure the quiz exists and is owned by the current user.
  const quiz = await prisma.quiz.findFirst({
    where: { id: validated.quizId, creator_id: userId },
    select: { id: true },
  });

  if (!quiz) {
    const err = new Error("Quiz not found");
    err.status = 404;
    throw err;
  }

  // Create the question and all its answers in a single transaction.
  const [question, createdAnswers] = await prisma.$transaction(async (tx) => {
    const last = await tx.question.findFirst({
      where: { quiz_id: validated.quizId },
      orderBy: { order_index: "desc" },
      select: { order_index: true },
    });

    // Auto-assign next order_index for this quiz.
    const orderIndex = last ? last.order_index + 1 : 1;

    const newQuestion = await tx.question.create({
      data: {
        quiz_id: validated.quizId,
        text: validated.text,
        type: validated.type,
        order_index: orderIndex,
      },
      select: {
        id: true,
        quiz_id: true,
        text: true,
        type: true,
        order_index: true,
      },
    });

    const newAnswers = await Promise.all(
      validated.answers.map((a) =>
        tx.answer.create({
          data: {
            question_id: newQuestion.id,
            text: a.text,
            is_correct: a.is_correct,
          },
          select: {
            id: true,
            question_id: true,
            text: true,
            is_correct: true,
          },
        })
      )
    );

    return [newQuestion, newAnswers];
  });

  return { question, answers: createdAnswers };
}

async function getQuizQuestions({ userId, quizId }) {
  // Ensure the quiz belongs to the user before returning questions.
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, creator_id: userId },
    select: { id: true },
  });

  if (!quiz) {
    const err = new Error("Quiz not found");
    err.status = 404;
    throw err;
  }

  const questions = await prisma.question.findMany({
    where: { quiz_id: quizId },
    orderBy: { order_index: "asc" },
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
          is_correct: true,
        },
      },
    },
  });

  return questions;
}

module.exports = {
  createQuestionWithAnswers,
  getQuizQuestions,
};
