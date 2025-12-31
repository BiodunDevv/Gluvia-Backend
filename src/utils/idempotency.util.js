/**
 * Store for tracking processed client-generated IDs to ensure idempotency
 * In production, use Redis or database-backed store
 */
const processedIds = new Map();

// Clean up old entries after 24 hours
const EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a client-generated ID has been processed
 * @param {string} clientGeneratedId
 * @returns {boolean}
 */
const isProcessed = (clientGeneratedId) => {
  if (!clientGeneratedId) return false;
  
  const entry = processedIds.get(clientGeneratedId);
  if (!entry) return false;
  
  // Check if expired
  if (Date.now() - entry.timestamp > EXPIRY_MS) {
    processedIds.delete(clientGeneratedId);
    return false;
  }
  
  return true;
};

/**
 * Mark a client-generated ID as processed
 * @param {string} clientGeneratedId
 * @param {any} result - Result to return if duplicate request comes
 */
const markProcessed = (clientGeneratedId, result = null) => {
  if (!clientGeneratedId) return;
  
  processedIds.set(clientGeneratedId, {
    timestamp: Date.now(),
    result,
  });
};

/**
 * Get result for a processed ID
 * @param {string} clientGeneratedId
 * @returns {any|null}
 */
const getProcessedResult = (clientGeneratedId) => {
  const entry = processedIds.get(clientGeneratedId);
  return entry?.result || null;
};

/**
 * Clean up expired entries (call periodically)
 */
const cleanup = () => {
  const now = Date.now();
  for (const [id, entry] of processedIds.entries()) {
    if (now - entry.timestamp > EXPIRY_MS) {
      processedIds.delete(id);
    }
  }
};

// Run cleanup every hour
setInterval(cleanup, 60 * 60 * 1000);

module.exports = {
  isProcessed,
  markProcessed,
  getProcessedResult,
  cleanup,
};
