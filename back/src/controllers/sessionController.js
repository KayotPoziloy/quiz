const sessionService = require("../services/sessionService");
const asyncHandler = require("../middleware/asyncHandler");

const createSession = asyncHandler(async (req, res) => {
  const session = await sessionService.createSession({
    userId: req.userId,
    quizId: req.body.quizId,
  });
  res.status(201).json({ session });
});

const joinSession = asyncHandler(async (req, res) => {
  const result = await sessionService.joinSession({
    roomCode: req.body.roomCode,
    nickname: req.body.nickname,
    userId: req.userId,
  });
  res.status(200).json({ playerSessionId: result.playerSession.id });
});

const startSession = asyncHandler(async (req, res) => {
  const session = await sessionService.startSession({
    userId: req.userId,
    userRole: req.userRole,
    sessionId: req.body.sessionId,
  });
  res.status(200).json({ session });
});

const getLeaderboard = asyncHandler(async (req, res) => {
  const players = await sessionService.getLeaderboard({
    sessionId: req.params.id,
  });
  res.status(200).json({ players });
});

const getCurrentQuestion = asyncHandler(async (req, res) => {
  const result = await sessionService.getCurrentQuestion({
    sessionId: req.params.id,
  });
  res.status(200).json(result);
});

const nextQuestion = asyncHandler(async (req, res) => {
  const result = await sessionService.nextQuestion({
    userId: req.userId,
    userRole: req.userRole,
    sessionId: req.body.sessionId,
  });
  res.status(200).json(result);
});

const endSession = asyncHandler(async (req, res) => {
  const result = await sessionService.endSession({
    userId: req.userId,
    userRole: req.userRole,
    sessionId: req.body.sessionId,
  });
  res.status(200).json(result);
});

const getSessionById = asyncHandler(async (req, res) => {
  const session = await sessionService.getSessionById({
    sessionId: req.params.id,
  });
  res.status(200).json({ session });
});

const getSessionByCode = asyncHandler(async (req, res) => {
  const session = await sessionService.getSessionByCode({
    roomCode: req.params.roomCode,
  });
  res.status(200).json({ session });
});

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
