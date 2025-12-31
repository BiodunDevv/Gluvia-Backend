const Audit = require("../models/audit.model");

/**
 * Log an audit event
 * @param {Object} params
 */
const logAudit = async ({
  action,
  who,
  target,
  payload,
  ipAddress,
  userAgent,
}) => {
  try {
    await Audit.create({
      action,
      who,
      target,
      payload,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
    // Don't throw - audit logging should not break main flow
  }
};

/**
 * Get audit logs with pagination
 */
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  const query = {};

  if (filters.who) {
    query.who = filters.who;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.collection) {
    query["target.collection"] = filters.collection;
  }

  if (filters.targetId) {
    query["target.id"] = filters.targetId;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    Audit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("who", "name email role")
      .lean(),
    Audit.countDocuments(query),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  logAudit,
  getAuditLogs,
};
