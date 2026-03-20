const answerService = require("../services/answerService");
const asyncHandler = require("../middleware/asyncHandler");

const submitAnswers = asyncHandler(async (req, res) => {
  const result = await answerService.submitAnswers({
    playerSessionId: req.body.playerSessionId,
    questionId: req.body.questionId,
    answerIds: req.body.answerIds,
  });
  res.status(200).json(result);
});

module.exports = {
  submitAnswers,
};
