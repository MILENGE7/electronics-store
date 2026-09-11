// Centralized error handler - keep all route handlers wrapped in try/catch and call next(err)
//
// Only errors deliberately thrown with an explicit `status` (e.g.
// Object.assign(new Error("Insufficient stock"), { status: 400 })) are
// controller-authored and safe to show a customer. Anything else — a raw
// Prisma/DB error, a network failure, an unexpected exception — defaults to
// status 500 and must never have its .message forwarded to the client, since
// that can include internal file paths, query internals, etc. The real
// error is still logged server-side above for debugging.
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = status < 500 && err.message ? err.message : "Internal server error";
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
