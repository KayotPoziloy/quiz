const { ZodError } = require("zod");

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        err.status = 400;
      }
      return next(err);
    }
  };
}

module.exports = {
  validateBody,
};
