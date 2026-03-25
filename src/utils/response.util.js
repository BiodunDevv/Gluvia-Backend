const sendSuccess = (
  res,
  {
    statusCode = 200,
    data = null,
    meta,
    message,
    ...extra
  } = {}
) => {
  const payload = {
    success: true,
    data,
  };

  if (meta !== undefined) payload.meta = meta;
  if (message) payload.message = message;

  return res.status(statusCode).json({
    ...payload,
    ...extra,
  });
};

const sendError = (
  res,
  {
    statusCode = 500,
    code = "INTERNAL_ERROR",
    message = "An unexpected error occurred",
    details,
    ...extra
  } = {}
) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    payload.error.details = details;
  }

  return res.status(statusCode).json({
    ...payload,
    ...extra,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
