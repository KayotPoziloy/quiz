const jwt = require("jsonwebtoken");

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role;
  } catch (err) {
    // ignore invalid token for optional auth
  }

  return next();
}

module.exports = {
  verifyJwt,
  optionalAuth,
};
