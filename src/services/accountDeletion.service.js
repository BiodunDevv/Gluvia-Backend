const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AccountDeletionRequest = require("../models/accountDeletionRequest.model");
const User = require("../models/user.model");
const MealLog = require("../models/mealLog.model");
const GlucoseLog = require("../models/glucoseLog.model");
const AIConversation = require("../models/aiConversation.model");
const SyncCheckpoint = require("../models/syncCheckpoint.model");
const DeviceToken = require("../models/deviceToken.model");
const Notification = require("../models/notification.model");
const emailService = require("./email.service");
const auditService = require("./audit.service");

const CODE_TTL_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;
const ACTIVE_STATUSES = [
  "verification_sent",
  "pending_admin_review",
  "approved_scheduled",
];

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const publicRequest = (request) => {
  if (!request) return null;

  return {
    id: request._id,
    email: request.email,
    status: request.status,
    requestedAt: request.requestedAt,
    verifiedAt: request.verifiedAt,
    approvedAt: request.approvedAt,
    scheduleOption: request.scheduleOption,
    scheduledDeletionAt: request.scheduledDeletionAt,
    completedAt: request.completedAt,
    cancelledAt: request.cancelledAt,
    cancellationReason: request.cancellationReason,
    dataSummary: request.dataSummary,
  };
};

const adminRequest = (request) => {
  if (!request) return null;
  const obj = request.toObject ? request.toObject() : request;
  delete obj.verificationCodeHash;
  return obj;
};

const addEvent = (request, type, message, by) => {
  request.events.push({
    type,
    message,
    by,
    at: new Date(),
  });
};

const createCode = () => {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
};

const getActiveRequestByEmail = (email) => {
  return AccountDeletionRequest.findOne({
    email,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ createdAt: -1 });
};

const sendDeletionCode = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    email: normalizedEmail,
    role: "user",
    deleted: { $ne: true },
  });
  let request = await getActiveRequestByEmail(normalizedEmail);
  const code = createCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  if (!request) {
    request = new AccountDeletionRequest({
      email: normalizedEmail,
      userId: user?._id,
      verificationCodeHash: codeHash,
      verificationExpiresAt: expiresAt,
      requestedAt: new Date(),
    });
    addEvent(request, "verification_sent", "Deletion verification code sent");
  } else {
    request.userId = request.userId || user?._id;
    request.verificationCodeHash = codeHash;
    request.verificationExpiresAt = expiresAt;
    request.verificationAttempts = 0;
    addEvent(request, "verification_resent", "Deletion verification code resent");
  }

  await request.save();
  await emailService.sendAccountDeletionCodeEmail(normalizedEmail, code, CODE_TTL_MINUTES);

  return {
    message:
      "If this email belongs to a Gluvia AI account, a verification code has been sent.",
  };
};

const verifyDeletionCode = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const request = await getActiveRequestByEmail(normalizedEmail);

  if (!request || !request.verificationCodeHash) {
    const error = new Error("No active deletion verification request was found");
    error.statusCode = 404;
    throw error;
  }

  if (
    !request.verificationExpiresAt ||
    request.verificationExpiresAt.getTime() < Date.now()
  ) {
    request.status = "expired";
    addEvent(request, "expired", "Verification code expired");
    await request.save();
    const error = new Error("Verification code expired. Please request a new code.");
    error.statusCode = 400;
    throw error;
  }

  if (request.verificationAttempts >= MAX_CODE_ATTEMPTS) {
    const error = new Error("Too many verification attempts. Please request a new code.");
    error.statusCode = 429;
    throw error;
  }

  const isValid = await bcrypt.compare(String(code || ""), request.verificationCodeHash);
  if (!isValid) {
    request.verificationAttempts += 1;
    await request.save();
    const error = new Error("Invalid verification code");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    email: normalizedEmail,
    role: "user",
    deleted: { $ne: true },
  });

  if (!user) {
    request.status = "cancelled";
    request.cancelledAt = new Date();
    request.cancellationReason = "No active Gluvia AI user account was found for this email.";
    addEvent(request, "no_account_found", request.cancellationReason);
    await request.save();

    return {
      request: publicRequest(request),
      accountFound: false,
      message: request.cancellationReason,
    };
  }

  request.userId = user._id;
  request.status =
    request.status === "approved_scheduled"
      ? "approved_scheduled"
      : "pending_admin_review";
  const wasAlreadyVerified = Boolean(request.verifiedAt);
  request.verifiedAt = request.verifiedAt || new Date();
  request.verificationAttempts = 0;
  addEvent(request, "verified", "Email ownership verified for deletion request");
  await request.save();
  if (!wasAlreadyVerified) {
    await emailService.sendAccountDeletionReceivedEmail(normalizedEmail, user.name || "there");
  }

  return {
    request: publicRequest(request),
    accountFound: true,
    message: "Your account deletion request has been submitted for review.",
  };
};

const getVerifiedStatus = async (email, code) => {
  const result = await verifyDeletionCode(email, code);
  return result;
};

const cancelDeletionRequest = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const result = await verifyDeletionCode(normalizedEmail, code);
  const request = await AccountDeletionRequest.findById(result.request?.id);

  if (!request || !ACTIVE_STATUSES.includes(request.status)) {
    const error = new Error("This deletion request can no longer be cancelled.");
    error.statusCode = 400;
    throw error;
  }

  request.status = "cancelled";
  request.cancelledAt = new Date();
  request.cancellationReason = "Cancelled by user";
  addEvent(request, "cancelled_by_user", "User cancelled the deletion request");
  await request.save();
  await emailService.sendAccountDeletionCancelledEmail(normalizedEmail, "Your deletion request was cancelled.");

  return publicRequest(request);
};

const listAdminRequests = async ({ status, page = 1, limit = 20 }) => {
  const query = {};
  if (status && status !== "all") query.status = status;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [requests, total] = await Promise.all([
    AccountDeletionRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("userId", "name email role deleted")
      .populate("approvedBy", "name email role")
      .populate("cancelledBy", "name email role")
      .lean(),
    AccountDeletionRequest.countDocuments(query),
  ]);

  return {
    requests,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const getAdminRequestById = async (requestId) => {
  const request = await AccountDeletionRequest.findById(requestId)
    .populate("userId", "name email role deleted createdAt")
    .populate("approvedBy", "name email role")
    .populate("cancelledBy", "name email role");

  if (!request) {
    const error = new Error("Deletion request not found");
    error.statusCode = 404;
    throw error;
  }

  return adminRequest(request);
};

const getScheduleDate = (schedule) => {
  if (schedule === "immediate") return new Date();
  if (schedule === "15_days") return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  if (schedule === "30_days") return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const error = new Error("schedule must be one of immediate, 15_days, or 30_days");
  error.statusCode = 400;
  throw error;
};

const completeDeletion = async (request, completedBy) => {
  if (!request.userId) {
    const error = new Error("Deletion request is not linked to a user account");
    error.statusCode = 400;
    throw error;
  }

  const userId = request.userId._id || request.userId;
  const user = await User.findById(userId);

  await Promise.all([
    MealLog.deleteMany({ userId }),
    GlucoseLog.deleteMany({ userId }),
    AIConversation.deleteMany({ userId }),
    SyncCheckpoint.deleteMany({ userId }),
    DeviceToken.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
  ]);

  if (user) {
    user.deleted = true;
    user.email = `deleted+${user._id}@deleted.gluvia.local`;
    user.name = "Deleted User";
    user.phone = undefined;
    user.profile = {};
    user.consent = { accepted: false, timestamp: new Date() };
    user.passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }

  request.status = "completed";
  request.completedAt = new Date();
  addEvent(request, "completed", "User account and associated data deleted", completedBy);
  await request.save();
  await emailService.sendAccountDeletionCompletedEmail(request.email);

  await auditService.logAudit({
    action: "account_deletion_completed",
    who: completedBy,
    target: { collection: "AccountDeletionRequest", id: request._id },
    payload: { email: request.email, userId },
  });

  return request;
};

const approveDeletionRequest = async (requestId, { schedule, adminNotes }, adminUser) => {
  const request = await AccountDeletionRequest.findById(requestId);

  if (!request) {
    const error = new Error("Deletion request not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["pending_admin_review", "approved_scheduled"].includes(request.status)) {
    const error = new Error("Only verified pending requests can be approved");
    error.statusCode = 400;
    throw error;
  }

  const scheduledDeletionAt = getScheduleDate(schedule);
  request.approvedAt = new Date();
  request.approvedBy = adminUser?._id;
  request.scheduleOption = schedule;
  request.scheduledDeletionAt = scheduledDeletionAt;
  request.adminNotes = adminNotes;
  addEvent(request, "approved", `Approved with ${schedule} deletion schedule`, adminUser?._id);

  if (schedule === "immediate") {
    await request.save();
    const completed = await completeDeletion(request, adminUser?._id);
    return adminRequest(completed);
  }

  request.status = "approved_scheduled";
  await request.save();
  await emailService.sendAccountDeletionScheduledEmail(
    request.email,
    scheduledDeletionAt
  );

  await auditService.logAudit({
    action: "account_deletion_scheduled",
    who: adminUser?._id,
    target: { collection: "AccountDeletionRequest", id: request._id },
    payload: { email: request.email, schedule, scheduledDeletionAt },
  });

  return adminRequest(request);
};

const adminCancelDeletionRequest = async (requestId, { reason }, adminUser) => {
  const request = await AccountDeletionRequest.findById(requestId);

  if (!request) {
    const error = new Error("Deletion request not found");
    error.statusCode = 404;
    throw error;
  }

  if (!ACTIVE_STATUSES.includes(request.status)) {
    const error = new Error("This deletion request can no longer be cancelled");
    error.statusCode = 400;
    throw error;
  }

  request.status = "cancelled";
  request.cancelledAt = new Date();
  request.cancelledBy = adminUser?._id;
  request.cancellationReason = reason || "Cancelled by admin";
  addEvent(request, "cancelled_by_admin", request.cancellationReason, adminUser?._id);
  await request.save();
  await emailService.sendAccountDeletionCancelledEmail(
    request.email,
    request.cancellationReason
  );

  await auditService.logAudit({
    action: "account_deletion_cancelled",
    who: adminUser?._id,
    target: { collection: "AccountDeletionRequest", id: request._id },
    payload: { email: request.email, reason: request.cancellationReason },
  });

  return adminRequest(request);
};

const processDueDeletionRequests = async () => {
  const dueRequests = await AccountDeletionRequest.find({
    status: "approved_scheduled",
    scheduledDeletionAt: { $lte: new Date() },
  }).limit(25);

  for (const request of dueRequests) {
    try {
      await completeDeletion(request, request.approvedBy);
    } catch (error) {
      addEvent(request, "completion_failed", error.message, request.approvedBy);
      await request.save();
    }
  }

  return dueRequests.length;
};

module.exports = {
  sendDeletionCode,
  verifyDeletionCode,
  getVerifiedStatus,
  cancelDeletionRequest,
  listAdminRequests,
  getAdminRequestById,
  approveDeletionRequest,
  adminCancelDeletionRequest,
  processDueDeletionRequests,
};
