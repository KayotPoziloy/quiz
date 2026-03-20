const path = require("path");
const { execSync } = require("child_process");

require("./setupEnv");

module.exports = async () => {
  const bin = process.platform === "win32"
    ? path.join(__dirname, "..", "node_modules", ".bin", "prisma.cmd")
    : path.join(__dirname, "..", "node_modules", ".bin", "prisma");

  execSync(`"${bin}" db push --force-reset --skip-generate`, {
    stdio: "inherit",
    env: process.env,
  });
};
