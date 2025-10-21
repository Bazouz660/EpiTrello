import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { logger } from '../utils/logger.js';

export const notFoundHandler = (_req, res, next) => {
  next({ status: StatusCodes.NOT_FOUND, message: getReasonPhrase(StatusCodes.NOT_FOUND) });
};

export const errorHandler = (err, _req, res, _next) => {
  void _next;
  const status = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR);

  if (status >= 500) {
    logger.error('Unhandled error', err);
  }

  res.status(status).json({
    status,
    message
  });
};
