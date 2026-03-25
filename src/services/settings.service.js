const Config = require("../models/config.model");

const normalizeFlag = (value) =>
  ["1", "true", "yes", "on"].includes(String(value).toLowerCase());

const DEFAULT_MAINTENANCE_MESSAGE =
  "Gluvia AI is temporarily unavailable for maintenance. Please try again later.";
const DEFAULT_SUPPORT_PHONE = "+2348000000000";
const SETTINGS_CACHE_TTL_MS = 30 * 1000;

const settingsCache = {
  maintenanceMode: { value: null, expiresAt: 0 },
  maintenanceSettings: { value: null, expiresAt: 0 },
  appSettings: { value: null, expiresAt: 0 },
};

const getCachedValue = (key) => {
  const entry = settingsCache[key];
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.value;
};

const setCachedValue = (key, value) => {
  settingsCache[key] = {
    value,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  };
};

const clearSettingsCache = (...keys) => {
  keys.forEach((key) => {
    if (settingsCache[key]) {
      settingsCache[key] = { value: null, expiresAt: 0 };
    }
  });
};

const normalizeUrl = (value) => {
  if (!value) return "";
  return String(value).trim();
};

const getMaintenanceMode = async (fallback = "false") => {
  const cached = getCachedValue("maintenanceMode");
  if (cached !== null) {
    return cached;
  }

  const record = await Config.findOne({ key: "maintenanceMode" }).lean();
  const value = record ? normalizeFlag(record.value) : normalizeFlag(fallback);
  setCachedValue("maintenanceMode", value);
  return value;
};

const setMaintenanceMode = async (enabled, message) => {
  await Config.findOneAndUpdate(
    { key: "maintenanceMode" },
    { value: Boolean(enabled) },
    { upsert: true, new: true }
  );

  await Config.findOneAndUpdate(
    { key: "maintenanceMessage" },
    {
      value:
        message ||
        "Gluvia AI is temporarily unavailable for maintenance. Please try again later.",
    },
    { upsert: true, new: true }
  );

  clearSettingsCache("maintenanceMode", "maintenanceSettings");

  return getMaintenanceSettings();
};

const getMaintenanceSettings = async (fallback = "false") => {
  const cached = getCachedValue("maintenanceSettings");
  if (cached) {
    return cached;
  }

  const [enabled, messageRecord] = await Promise.all([
    getMaintenanceMode(fallback),
    Config.findOne({ key: "maintenanceMessage" }).lean(),
  ]);

  const settings = {
    enabled,
    message:
      messageRecord?.value || DEFAULT_MAINTENANCE_MESSAGE,
  };

  setCachedValue("maintenanceSettings", settings);
  return settings;
};

const getAppSettings = async () => {
  const cached = getCachedValue("appSettings");
  if (cached) {
    return cached;
  }

  const records = await Config.find({
    key: {
      $in: ["supportPhone", "googleFormLink"],
    },
  }).lean();

  const recordMap = records.reduce((acc, record) => {
    acc[record.key] = record.value;
    return acc;
  }, {});

  const appSettings = {
    supportPhone: String(recordMap.supportPhone || DEFAULT_SUPPORT_PHONE),
    googleFormLink: normalizeUrl(recordMap.googleFormLink),
  };

  setCachedValue("appSettings", appSettings);
  return appSettings;
};

const setAppSettings = async ({ supportPhone, googleFormLink }) => {
  const normalizedSupportPhone = String(
    supportPhone || DEFAULT_SUPPORT_PHONE
  ).trim();
  const normalizedGoogleFormLink = normalizeUrl(googleFormLink);

  await Promise.all([
    Config.findOneAndUpdate(
      { key: "supportPhone" },
      { value: normalizedSupportPhone },
      { upsert: true, new: true }
    ),
    Config.findOneAndUpdate(
      { key: "googleFormLink" },
      { value: normalizedGoogleFormLink },
      { upsert: true, new: true }
    ),
  ]);

  clearSettingsCache("appSettings");

  return getAppSettings();
};

module.exports = {
  getMaintenanceMode,
  setMaintenanceMode,
  getMaintenanceSettings,
  getAppSettings,
  setAppSettings,
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_SUPPORT_PHONE,
};
