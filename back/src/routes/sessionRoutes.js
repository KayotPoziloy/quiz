const express = require("express");
const { createSession, joinSession, startSession, getLeaderboard, getCurrentQuestion, nextQuestion, endSession, getSessionById, getSessionByCode } = require("../controllers/sessionController");
const { verifyJwt, optionalAuth } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");
const { createSessionSchema, joinSessionSchema, startSessionSchema, nextQuestionSchema, endSessionSchema } = require("../validators/schemas");

const router = express.Router();

router.post("/create", verifyJwt, validateBody(createSessionSchema), createSession);
router.post("/join", optionalAuth, validateBody(joinSessionSchema), joinSession);
router.post("/start", verifyJwt, validateBody(startSessionSchema), startSession);
router.post("/next-question", verifyJwt, validateBody(nextQuestionSchema), nextQuestion);
router.post("/end", verifyJwt, validateBody(endSessionSchema), endSession);
router.get("/code/:roomCode", getSessionByCode);
router.get("/:id/leaderboard", getLeaderboard);
router.get("/:id/current-question", getCurrentQuestion);
router.get("/:id", getSessionById);

module.exports = router;
