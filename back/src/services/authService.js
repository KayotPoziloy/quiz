const prisma = require("./prismaClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;

function ensureJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error("JWT secret is not configured");
    err.status = 500;
    throw err;
  }
  return secret;
}

async function registerUser({ email, password, role }) {
  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  if (role && role !== "organizer" && role !== "player") {
    const err = new Error("Invalid role");
    err.status = 400;
    throw err;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  // Hash password before storing.
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: role || "player",
    },
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return user;
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }

  // Issue JWT for authenticated access.
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    ensureJwtSecret(),
    { expiresIn: "7d" }
  );

  return { token };
}

module.exports = {
  registerUser,
  loginUser,
};
