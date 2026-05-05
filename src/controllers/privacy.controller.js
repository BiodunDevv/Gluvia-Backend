const { asyncHandler } = require("../middlewares/error.middleware");
const { sendSuccess, sendError } = require("../utils/response.util");
const accountDeletionService = require("../services/accountDeletion.service");

/**
 * @swagger
 * tags:
 *   name: Privacy
 *   description: Privacy and account deletion operations
 */

const handleServiceError = (res, error) => {
  return sendError(res, {
    statusCode: error.statusCode || 500,
    code: error.statusCode ? "ACCOUNT_DELETION_ERROR" : "INTERNAL_ERROR",
    message: error.message,
  });
};

/**
 * @swagger
 * /privacy/account-deletion/request-code:
 *   post:
 *     summary: Request a 6-digit account deletion verification code
 *     tags: [Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email queued when the address is eligible
 */
const requestDeletionCode = asyncHandler(async (req, res) => {
  try {
    const result = await accountDeletionService.sendDeletionCode(req.body.email);
    return sendSuccess(res, { message: result.message });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/**
 * @swagger
 * /privacy/account-deletion/verify-code:
 *   post:
 *     summary: Verify account deletion code and submit the deletion request
 *     tags: [Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Deletion request submitted or current active request returned
 */
const verifyDeletionCode = asyncHandler(async (req, res) => {
  try {
    const result = await accountDeletionService.verifyDeletionCode(
      req.body.email,
      req.body.code
    );
    return sendSuccess(res, {
      data: result,
      message: result.message,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/**
 * @swagger
 * /privacy/account-deletion/status:
 *   post:
 *     summary: Verify email code and return the current deletion request status
 *     tags: [Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Current deletion request status
 */
const getDeletionStatus = asyncHandler(async (req, res) => {
  try {
    const result = await accountDeletionService.getVerifiedStatus(
      req.body.email,
      req.body.code
    );
    return sendSuccess(res, {
      data: result,
      message: "Deletion request status loaded",
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

/**
 * @swagger
 * /privacy/account-deletion/cancel:
 *   post:
 *     summary: Cancel a pending or scheduled account deletion request
 *     tags: [Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deletion request cancelled
 */
const cancelDeletionRequest = asyncHandler(async (req, res) => {
  try {
    const request = await accountDeletionService.cancelDeletionRequest(
      req.body.email,
      req.body.code
    );
    return sendSuccess(res, {
      data: { request },
      message: "Deletion request cancelled",
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
});

module.exports = {
  requestDeletionCode,
  verifyDeletionCode,
  getDeletionStatus,
  cancelDeletionRequest,
};
