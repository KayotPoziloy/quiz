const express = require("express");
const { submitAnswers } = require("../controllers/answerController");
const { validateBody } = require("../middleware/validate");
const { submitAnswersSchema } = require("../validators/schemas");

const router = express.Router();

router.post("/submit", validateBody(submitAnswersSchema), submitAnswers);

module.exports = router;
