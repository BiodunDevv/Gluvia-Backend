const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const https = require("https");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Create axios instance with SSL configuration
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // For development - remove in production
    minVersion: "TLSv1.2",
  }),
  timeout: 10000, // 10 second timeout
});

/**
 * Send email via Brevo API
 * @param {Object} params
 */
const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  // Validate API key
  if (!config.brevo.apiKey) {
    console.error("Brevo API key is not configured");
    throw new Error("Email service not configured");
  }

  try {
    console.log("Sending email to:", to);
    console.log("Using API key:", config.brevo.apiKey.substring(0, 10) + "...");

    const response = await axiosInstance.post(
      BREVO_API_URL,
      {
        sender: {
          name: config.brevo.fromName,
          email: config.brevo.fromEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      },
      {
        headers: {
          "api-key": config.brevo.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("Email sent successfully:", response.data.messageId);
    return { ok: true, messageId: response.data.messageId };
  } catch (error) {
    console.error("Brevo API error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Load and render email template
 * @param {string} templateName - Template file name (without .html)
 * @param {Object} variables - Variables to replace in template
 */
const renderTemplate = async (templateName, variables = {}) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../emails",
      `${templateName}.html`
    );
    let template = await fs.readFile(templatePath, "utf8");

    // Simple template variable replacement ({{variable}})
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, variables[key] || "");
    });

    return template;
  } catch (error) {
    console.error("Template render error:", error.message);
    throw new Error("Failed to render email template");
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (to, name) => {
  const htmlContent = await renderTemplate("welcome", { name });

  return sendEmail({
    to,
    subject: "Welcome to Gluvia AI",
    htmlContent,
    textContent: `Hi ${name}, welcome to Gluvia AI!`,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (to, name, resetUrl) => {
  const htmlContent = await renderTemplate("password_reset", {
    name,
    resetUrl,
  });

  return sendEmail({
    to,
    subject: "Gluvia AI - Password Reset",
    htmlContent,
    textContent: `Hi ${name}, click the link to reset your password: ${resetUrl}`,
  });
};

/**
 * Send admin notification email
 */
const sendAdminNotifyEmail = async (adminEmail, userEmail, createdAt) => {
  const htmlContent = await renderTemplate("admin_notify_new_user", {
    email: userEmail,
    createdAt: new Date(createdAt).toLocaleString(),
  });

  return sendEmail({
    to: adminEmail,
    subject: "New User Registered - Gluvia AI",
    htmlContent,
    textContent: `New user registered: ${userEmail}`,
  });
};

/**
 * Send sync failed notification
 */
const sendSyncFailedEmail = async (adminEmail, userEmail, errorMessage) => {
  const htmlContent = await renderTemplate("sync_failed", {
    email: userEmail,
    errorMessage,
  });

  return sendEmail({
    to: adminEmail,
    subject: "Sync Failed - Gluvia AI",
    htmlContent,
    textContent: `Sync failed for user: ${userEmail}. Error: ${errorMessage}`,
  });
};

/**
 * Send admin account created email
 */
const sendAdminCreatedEmail = async (to, name, email, createdBy, resetUrl) => {
  const htmlContent = await renderTemplate("admin_account_created", {
    name,
    email,
    createdBy,
    resetUrl,
  });

  return sendEmail({
    to,
    subject: "Your Gluvia AI Admin Account Has Been Created",
    htmlContent,
    textContent: `Hi ${name}, an administrator account has been created for you on Gluvia AI. Please reset your password using this link: ${resetUrl}`,
  });
};

const sendAccountDeletionCodeEmail = async (to, code, expiresInMinutes) => {
  const htmlContent = await renderTemplate("account_deletion_code", {
    code,
    expiresInMinutes,
  });

  return sendEmail({
    to,
    subject: "Verify your Gluvia AI account deletion request",
    htmlContent,
    textContent: `Your Gluvia AI account deletion code is ${code}. It expires in ${expiresInMinutes} minutes.`,
  });
};

const sendAccountDeletionReceivedEmail = async (to, name) => {
  const htmlContent = await renderTemplate("account_deletion_received", {
    name,
  });

  return sendEmail({
    to,
    subject: "Gluvia AI account deletion request received",
    htmlContent,
    textContent:
      "Your Gluvia AI account deletion request has been received and is waiting for admin review.",
  });
};

const sendAccountDeletionScheduledEmail = async (to, scheduledDeletionAt) => {
  const formattedDate = new Date(scheduledDeletionAt).toLocaleString();
  const htmlContent = await renderTemplate("account_deletion_scheduled", {
    scheduledDeletionAt: formattedDate,
  });

  return sendEmail({
    to,
    subject: "Gluvia AI account deletion scheduled",
    htmlContent,
    textContent: `Your Gluvia AI account deletion has been scheduled for ${formattedDate}.`,
  });
};

const sendAccountDeletionCompletedEmail = async (to) => {
  const htmlContent = await renderTemplate("account_deletion_completed", {});

  return sendEmail({
    to,
    subject: "Gluvia AI account deletion completed",
    htmlContent,
    textContent:
      "Your Gluvia AI account and associated app data have been deleted.",
  });
};

const sendAccountDeletionCancelledEmail = async (to, reason) => {
  const htmlContent = await renderTemplate("account_deletion_cancelled", {
    reason,
  });

  return sendEmail({
    to,
    subject: "Gluvia AI account deletion request cancelled",
    htmlContent,
    textContent: `Your Gluvia AI account deletion request was cancelled. ${reason || ""}`,
  });
};

module.exports = {
  sendEmail,
  renderTemplate,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminNotifyEmail,
  sendSyncFailedEmail,
  sendAdminCreatedEmail,
  sendAccountDeletionCodeEmail,
  sendAccountDeletionReceivedEmail,
  sendAccountDeletionScheduledEmail,
  sendAccountDeletionCompletedEmail,
  sendAccountDeletionCancelledEmail,
};
