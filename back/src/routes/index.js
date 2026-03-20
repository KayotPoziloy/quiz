const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const quizRoutes = require("./quizRoutes");
const questionRoutes = require("./questionRoutes");
const sessionRoutes = require("./sessionRoutes");
const answerRoutes = require("./answerRoutes");
const { verifyJwt } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/quizzes", verifyJwt, quizRoutes);
router.use("/questions", verifyJwt, questionRoutes);
router.use("/sessions", sessionRoutes);
router.use("/answers", answerRoutes);

module.exports = router;
