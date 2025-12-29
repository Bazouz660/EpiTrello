import PropTypes from 'prop-types';

const statusConfig = {
  connected: {
    color: 'bg-green-500',
    text: 'Connected',
    pulse: false,
  },
  connecting: {
    color: 'bg-yellow-500',
    text: 'Connecting...',
    pulse: true,
  },
  disconnected: {
    color: 'bg-gray-500',
    text: 'Disconnected',
    pulse: false,
  },
  error: {
    color: 'bg-red-500',
    text: 'Connection Error',
    pulse: false,
  },
};

const ConnectionStatus = ({ status, className = '', showLabel = true, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.disconnected;

  const sizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
  };

  const dotSize = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center">
        <span className={`${dotSize} rounded-full ${config.color}`} />
        {config.pulse && (
          <span
            className={`absolute ${dotSize} animate-ping rounded-full ${config.color} opacity-75`}
          />
        )}
      </div>
      {showLabel && <span className="text-xs text-gray-400">{config.text}</span>}
    </div>
  );
};

ConnectionStatus.propTypes = {
  status: PropTypes.oneOf(['connected', 'connecting', 'disconnected', 'error']).isRequired,
  className: PropTypes.string,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
};

export default ConnectionStatus;
