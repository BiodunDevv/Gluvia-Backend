const config = require('../config');

/**
 * Basic auth for Swagger docs in production
 */
const swaggerAuth = (req, res, next) => {
  // Only protect in production if credentials are set
  if (config.env !== 'production' || !config.swagger.username || !config.swagger.password) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required for API documentation',
      },
    });
  }

  try {
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username === config.swagger.username && password === config.swagger.password) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      },
    });
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization header',
      },
    });
  }
};

module.exports = swaggerAuth;
