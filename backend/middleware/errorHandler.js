const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Body parser entity too large
  if (err.type === 'entity.too.large' || err.statusCode === 413 || err.status === 413) {
    statusCode = 413;
    message = 'Request payload too large. Please reduce the size of the request.';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = `Resource not found with id: ${err.value}`;
    statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token has expired';
    statusCode = 401;
  }

  // In production, sanitize 500 errors so sensitive internal details don't leak
  let clientMessage = message;
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    clientMessage = 'An unexpected server error occurred. Please try again later.';
  }

  const response = {
    success: false,
    message: clientMessage,
  };
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
