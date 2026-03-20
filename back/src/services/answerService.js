const prisma = require("./prismaClient");

function validateSubmitInput({ playerSessionId, questionId, answerIds }) {
  // Basic input checks to keep DB operations safe.
  if (!playerSessionId || typeof playerSessionId !== "string") {
    const err = new Error("playerSessionId is required");
    err.status = 400;
    throw err;
  }

  if (!questionId || typeof questionId !== "string") {
    const err = new Error("questionId is required");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(answerIds) || answerIds.length === 0) {
    const err = new Error("answerIds must be a non-empty array");
    err.status = 400;
    throw err;
  }

  const unique = Array.from(new Set(answerIds));
  if (unique.length !== answerIds.length) {
    const err = new Error("answerIds must be unique");
    err.status = 400;
    throw err;
  }

  return { playerSessionId, questionId, answerIds: unique };
}

function areSetsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

async function submitAnswers({ playerSessionId, questionId, answerIds }) {
  const validated = validateSubmitInput({ playerSessionId, questionId, answerIds });

  // Use a transaction to keep insert + scoring consistent.
  const result = await prisma.$transaction(async (tx) => {
    const playerSession = await tx.playerSession.findUnique({
      where: { id: validated.playerSessionId },
      select: { id: true, score: true },
    });

    if (!playerSession) {
      const err = new Error("Player session not found");
      err.status = 404;
      throw err;
    }

    const question = await tx.question.findUnique({
      where: { id: validated.questionId },
      select: { id: true },
    });

    if (!question) {
      const err = new Error("Question not found");
      err.status = 404;
      throw err;
    }

    const existing = await tx.playerAnswer.findFirst({
      where: {
        player_session_id: validated.playerSessionId,
        question_id: validated.questionId,
      },
      select: { id: true },
    });

    // Prevent duplicate submissions for the same question.
    if (existing) {
      const err = new Error("Answers already submitted for this question");
      err.status = 409;
      throw err;
    }

    // Load all correct answers for comparison.
    const allAnswers = await tx.answer.findMany({
      where: { question_id: validated.questionId },
      select: { id: true, is_correct: true },
    });

    const allAnswerIds = new Set(allAnswers.map((a) => a.id));
    const selectedIds = new Set(validated.answerIds);

    for (const id of selectedIds) {
      if (!allAnswerIds.has(id)) {
        const err = new Error("One or more answers do not belong to the question");
        err.status = 400;
        throw err;
      }
    }

    const correctIds = new Set(allAnswers.filter((a) => a.is_correct).map((a) => a.id));
    const isCorrect = areSetsEqual(selectedIds, correctIds);

    // Save all selected answers.
    await tx.playerAnswer.createMany({
      data: validated.answerIds.map((id) => ({
        player_session_id: validated.playerSessionId,
        question_id: validated.questionId,
        answer_id: id,
      })),
    });

    // Award points only if fully correct.
    if (isCorrect) {
      await tx.playerSession.update({
        where: { id: validated.playerSessionId },
        data: { score: { increment: 100 } },
      });
    }

    return { isCorrect, scoreAwarded: isCorrect ? 100 : 0 };
  });

  return result;
}

module.exports = {
  submitAnswers,
};
