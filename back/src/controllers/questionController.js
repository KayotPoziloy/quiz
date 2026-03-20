const questionService = require("../services/questionService");
const asyncHandler = require("../middleware/asyncHandler");

const createQuestion = asyncHandler(async (req, res) => {
  const result = await questionService.createQuestionWithAnswers({
    userId: req.userId,
    data: req.body,
  });
  res.status(201).json(result);
});

const getQuizQuestions = asyncHandler(async (req, res) => {
  const questions = await questionService.getQuizQuestions({
    userId: req.userId,
    quizId: req.params.id,
  });
  res.status(200).json({ questions });
});

module.exports = {
  createQuestion,
  getQuizQuestions,
};
