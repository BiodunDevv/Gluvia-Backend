const { ZodError } = require('zod');
const { sendError } = require("../utils/response.util");

/**
 * Validate request body/query/params using Zod schema
 * @param {ZodSchema} schema - Zod validation schema
 * @param {string} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, {
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      return sendError(res, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: error.message || 'Validation failed',
      });
    }
  };
};

module.exports = {
  validate,
};
