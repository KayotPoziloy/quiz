const { z } = require("zod");

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["organizer", "player"]).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const createQuizSchema = z.object({
  title: z.string().min(1),
  time_per_question: z.number().int().positive(),
});

const createQuestionSchema = z.object({
  quizId: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(["single", "multiple"]),
  answers: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .min(1),
});

const createSessionSchema = z.object({
  quizId: z.string().min(1),
});

const joinSessionSchema = z.object({
  roomCode: z.string().min(1),
  nickname: z.string().min(1),
});

const startSessionSchema = z.object({
  sessionId: z.string().min(1),
});

const nextQuestionSchema = z.object({
  sessionId: z.string().min(1),
});

const endSessionSchema = z.object({
  sessionId: z.string().min(1),
});

const submitAnswersSchema = z.object({
  playerSessionId: z.string().min(1),
  questionId: z.string().min(1),
  answerIds: z.array(z.string().min(1)).min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  createQuizSchema,
  createQuestionSchema,
  createSessionSchema,
  joinSessionSchema,
  startSessionSchema,
  nextQuestionSchema,
  endSessionSchema,
  submitAnswersSchema,
};
