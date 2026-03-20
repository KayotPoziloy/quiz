const express = require("express");
const { createQuiz, getQuizzes, getQuizById, deleteQuiz } = require("../controllers/quizController");
const { getQuizQuestions } = require("../controllers/questionController");
const { validateBody } = require("../middleware/validate");
const { createQuizSchema } = require("../validators/schemas");

const router = express.Router();

router.post("/", validateBody(createQuizSchema), createQuiz);
router.get("/", getQuizzes);
router.get("/:id", getQuizById);
router.get("/:id/questions", getQuizQuestions);
router.delete("/:id", deleteQuiz);

module.exports = router;
