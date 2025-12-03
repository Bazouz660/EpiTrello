const formatMessage = (level, message) =>
  `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;

export const logger = {
  info: (message, ...meta) => {
    console.log(formatMessage('info', message), ...meta);
  },
  warn: (message, ...meta) => {
    console.warn(formatMessage('warn', message), ...meta);
  },
  error: (message, ...meta) => {
    console.error(formatMessage('error', message), ...meta);
  },
  debug: (message, ...meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message), ...meta);
    }
  },
};
