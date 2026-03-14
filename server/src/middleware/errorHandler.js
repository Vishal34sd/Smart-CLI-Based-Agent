export const errorHandler = (err, req, res, _next) => {
  const statusCode = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
};
