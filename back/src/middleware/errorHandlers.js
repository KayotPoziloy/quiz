function notFound(req, res, next) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  if (err.name === "ZodError") {
    return res.status(400).json({ message: "Validation error", status: 400 });
  }

  res.status(status).json({ message, status });
}

module.exports = {
  notFound,
  errorHandler,
};
