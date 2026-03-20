const express = require("express");
const { createQuestion } = require("../controllers/questionController");
const { validateBody } = require("../middleware/validate");
const { createQuestionSchema } = require("../validators/schemas");

const router = express.Router();

router.post("/", validateBody(createQuestionSchema), createQuestion);

module.exports = router;
