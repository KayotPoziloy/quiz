const prisma = require("./services/prismaClient");
const answerService = require("./services/answerService");

async function emitQuestion(io, sessionId, quizId, orderIndex) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { time_per_question: true },
  });

  const question = await prisma.question.findFirst({
    where: { quiz_id: quizId, order_index: orderIndex },
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

  io.to(sessionId).emit("new_question", {
    question,
    timer: quiz ? quiz.time_per_question : null,
  });
}

async function emitLeaderboard(io, sessionId) {
  const players = await prisma.playerSession.findMany({
    where: { session_id: sessionId },
    orderBy: { score: "desc" },
    select: {
      id: true,
      nickname: true,
      score: true,
    },
  });

  io.to(sessionId).emit("leaderboard_update", { players });
  return players;
}

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_room", async ({ sessionId, playerSessionId } = {}) => {
      if (!sessionId || !playerSessionId) {
        socket.emit("error", { message: "sessionId and playerSessionId are required" });
        return;
      }

      const player = await prisma.playerSession.findUnique({
        where: { id: playerSessionId },
        select: { id: true, nickname: true, session_id: true },
      });

      if (!player || player.session_id !== sessionId) {
        socket.emit("error", { message: "Invalid session or player" });
        return;
      }

      socket.join(sessionId);
      io.to(sessionId).emit("player_joined", { nickname: player.nickname });
    });

    socket.on("start_quiz", async ({ sessionId } = {}) => {
      if (!sessionId) {
        socket.emit("error", { message: "sessionId is required" });
        return;
      }

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true, quiz_id: true },
      });

      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      io.to(sessionId).emit("quiz_started");
      await emitQuestion(io, sessionId, session.quiz_id, 1);
    });

    socket.on("submit_answer", async ({ playerSessionId, questionId, answerIds } = {}) => {
      try {
        const result = await answerService.submitAnswers({
          playerSessionId,
          questionId,
          answerIds,
        });
        socket.emit("answer_result", result);
      } catch (err) {
        socket.emit("error", { message: err.message || "Submit answer failed" });
      }
    });

    socket.on("next_question", async ({ sessionId } = {}) => {
      try {
        if (!sessionId) {
          socket.emit("error", { message: "sessionId is required" });
          return;
        }

        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { id: true, quiz_id: true, current_question_index: true },
        });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const updated = await prisma.session.update({
          where: { id: session.id },
          data: { current_question_index: { increment: 1 } },
          select: { quiz_id: true, current_question_index: true },
        });

        const nextQuestion = await prisma.question.findFirst({
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

        if (!nextQuestion) {
          const players = await emitLeaderboard(io, sessionId);
          io.to(sessionId).emit("quiz_finished", { players });
          return;
        }

        await emitLeaderboard(io, sessionId);
        await emitQuestion(io, sessionId, updated.quiz_id, updated.current_question_index);
      } catch (err) {
        socket.emit("error", { message: err.message || "Next question failed" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
}

module.exports = registerSocketHandlers;
