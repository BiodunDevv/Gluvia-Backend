const config = require("../config");
const { sendError } = require("../utils/response.util");
const { getMaintenanceSettings } = require("../services/settings.service");

const isMaintenanceEnabled = async () => {
  const settings = await getMaintenanceSettings(config.maintenanceMode);
  return settings.enabled;
};

const maintenanceGuard = async (req, res, next) => {
  const settings = await getMaintenanceSettings(config.maintenanceMode);
  if (!settings.enabled) {
    return next();
  }

  if (req.path === "/health") {
    return next();
  }

  if (req.user?.role === "admin" || req.userRole === "admin") {
    return next();
  }

  return sendError(res, {
    statusCode: 503,
    code: "MAINTENANCE_MODE",
    message: settings.message,
  });
};

module.exports = {
  maintenanceGuard,
  isMaintenanceEnabled,
};
