const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate a JWT token with a unique jti
 * @param {Object} payload - { sub: userId, role: string }
 * @returns {Object} { token, jti, expiresAt }
 */
const generateToken = (payload) => {
  const jti = uuidv4();
  const iat = Math.floor(Date.now() / 1000);
  const iatMs = Date.now();
  
  const tokenPayload = {
    sub: payload.sub,
    role: payload.role,
    jti,
    iat,
    iatMs,
  };
  
  const token = jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  });
  
  // Calculate expiry timestamp
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);
  
  return { token, jti, expiresAt };
};

/**
 * Verify and decode JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode token without verification (use for expired token inspection)
 * @param {string} token
 * @returns {Object|null}
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
