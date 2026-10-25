export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      const formattedErrors = err.issues?.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })) || [{ message: err.message }];

      return res.status(400).json({
        success: false,
        message: 'Validation failed for request data.',
        errors: formattedErrors,
      });
    }
  };
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || (
    err.name === 'ValidationError' ? 400 :
    err.name === 'CastError' ? 400 :
    err.code === 11000 ? 409 :
    res.statusCode >= 400 ? res.statusCode : 500
  );

  console.error('[Error Handler]', {
    method: req.method,
    path: req.path,
    statusCode,
    error: err.name || 'Error',
  });

  res.status(statusCode).json({
    success: false,
    message:
      err.code === 11000
        ? 'A record with this value already exists.'
        : statusCode === 400 && err.name === 'ValidationError'
          ? 'The submitted data is invalid.'
          : statusCode === 400 && err.name === 'CastError'
            ? 'The requested identifier is invalid.'
            : err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
