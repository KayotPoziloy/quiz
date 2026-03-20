const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envTestPath = path.join(__dirname, "..", ".env.test");
const envPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "testsecret";
}

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  if (url.searchParams.has("schema")) {
    url.searchParams.set("schema", "test");
  } else {
    url.searchParams.append("schema", "test");
  }
  process.env.DATABASE_URL = url.toString();
} else {
  throw new Error("DATABASE_URL_TEST or DATABASE_URL must be set for tests");
}
