const { ZodError } = require('zod');

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
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
      }

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Validation failed',
        },
      });
    }
  };
};

module.exports = {
  validate,
};
