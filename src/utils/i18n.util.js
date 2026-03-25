const {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_LABELS,
  normalizeLanguage,
  getRequestLanguage,
  getAiLanguageInstruction,
} = require("./language.util");

const MESSAGES = {
  auth_register_success: "User registered successfully",
  auth_email_registered: "Email already registered",
  auth_account_not_found:
    "Account not found. Please check your email or register a new account.",
  auth_invalid_password:
    "Invalid password. Please check your password and try again.",
  auth_user_not_found: "User not found",
  auth_reset_email_failed: "Failed to send reset email",
  auth_reset_token_invalid: "Invalid or expired reset token",
  auth_login_success: "Login successful",
  auth_logout_success: "Logged out successfully",
  auth_password_reset_request_success:
    "If the email exists, a password reset link has been sent",
  auth_password_reset_success: "Password reset successful",
  auth_profile_retrieved_success: "Profile retrieved successfully",
  auth_profile_updated_success: "Profile updated successfully",
  auth_photo_uploaded_success: "Profile photo uploaded successfully",
  auth_photo_missing: "No image file provided",
  auth_account_deleted_success: "Account deleted successfully",
  user_export_success: "User data exported successfully",
  validation_message_required: "Message is required",
  validation_meal_explanation_required:
    "mealType and selectedFoods are required",
  conversation_not_found: "Conversation not found",
  report_range_required: "from and to query parameters are required",
  report_forbidden: "You are not authorized to view this report",
  recommendation_explanation_fallback:
    "This recommendation is based on your glucose context, meal type, and the best available diabetes-friendly foods.",
  chat_name_known: "Your name is {{name}}.",
  chat_name_unknown: "Your name is not yet available in your profile.",
  chat_owner: "This app is provided by the Gluvia Team.",
  chat_greeting_known:
    "Hello {{name}}. I can help with diabetes-friendly meals, glucose patterns, food choices, and your Gluvia profile.",
  chat_greeting_unknown:
    "Hello. I can help with diabetes-friendly meals, glucose patterns, food choices, and your Gluvia profile.",
  chat_scope_limit:
    "I can help best with diabetes, food choices, glucose trends, meal planning, and your Gluvia account. For unrelated topics, please use a general assistant.",
  chat_glucose_high:
    "Your latest glucose reading is elevated at {{value}} mg/dL, so lower-GI and lower-carb choices are safer right now.",
  chat_glucose_low:
    "Your latest glucose reading is low at {{value}} mg/dL, so you should avoid overly restrictive advice and use balanced recovery choices.",
  chat_glucose_balanced:
    "Your latest glucose reading is {{value}} mg/dL, which supports a balanced recommendation.",
  chat_glucose_missing:
    "I do not have a recent glucose reading, so I am using conservative diabetes-safe guidance.",
  chat_profile_context: "I am using your profile context ({{details}}).",
  chat_profile_missing:
    "Your profile is incomplete, so the guidance is based on general diabetes-safe defaults.",
  chat_meal_missing:
    "If you log meals consistently, I can tailor the next suggestion more precisely.",
  chat_stream_done: "done",
};

const interpolate = (template, values = {}) =>
  String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) =>
    values[key] === undefined || values[key] === null ? "" : String(values[key])
  );

const t = (key, language, values) => {
  const template = MESSAGES[key];

  if (!template) {
    return key;
  }

  return interpolate(template, values);
};

module.exports = {
  SUPPORTED_LANGUAGES,
  FALLBACK_LANGUAGE,
  LANGUAGE_LABELS,
  normalizeLanguage,
  t,
  getAiLanguageInstruction,
  getRequestLanguage,
};
