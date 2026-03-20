const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = require("./app");
const prisma = require("./services/prismaClient");

const PORT = process.env.PORT || 3000;

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const registerSocketHandlers = require("./socket");
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = { io };
