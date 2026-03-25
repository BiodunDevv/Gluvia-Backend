process.env.JWT_SECRET = "test-secret";

const config = require("../src/config");
jest.mock("../src/services/settings.service", () => ({
  getMaintenanceSettings: jest.fn(),
}));
const { getMaintenanceSettings } = require("../src/services/settings.service");
const {
  maintenanceGuard,
} = require("../src/middlewares/maintenance.middleware");

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  return res;
};

describe("maintenanceGuard", () => {
  const originalMaintenanceMode = config.maintenanceMode;

  afterEach(() => {
    config.maintenanceMode = originalMaintenanceMode;
    jest.clearAllMocks();
  });

  it("blocks non-admin requests during maintenance mode", async () => {
    config.maintenanceMode = "true";
    getMaintenanceSettings.mockResolvedValue({
      enabled: true,
      message: "Maintenance in progress",
    });
    const req = {
      path: "/api/v1/foods",
      user: { role: "user" },
    };
    const res = createResponse();
    const next = jest.fn();

    await maintenanceGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "MAINTENANCE_MODE",
        }),
      })
    );
  });

  it("allows admins during maintenance mode", async () => {
    config.maintenanceMode = "true";
    getMaintenanceSettings.mockResolvedValue({
      enabled: true,
      message: "Maintenance in progress",
    });
    const req = {
      path: "/api/v1/admin/dashboard",
      user: { role: "admin" },
    };
    const res = createResponse();
    const next = jest.fn();

    await maintenanceGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.payload).toBeNull();
  });
});
