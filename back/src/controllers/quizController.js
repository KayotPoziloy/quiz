const quizService = require("../services/quizService");
const asyncHandler = require("../middleware/asyncHandler");

const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.createQuiz({
    userId: req.userId,
    data: req.body,
  });
  res.status(201).json({ quiz });
});

const getQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await quizService.getUserQuizzes(req.userId);
  res.status(200).json({ quizzes });
});

const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await quizService.getUserQuizById({
    userId: req.userId,
    quizId: req.params.id,
  });
  res.status(200).json({ quiz });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const result = await quizService.deleteUserQuiz({
    userId: req.userId,
    quizId: req.params.id,
  });
  res.status(200).json(result);
});

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  deleteQuiz,
};
