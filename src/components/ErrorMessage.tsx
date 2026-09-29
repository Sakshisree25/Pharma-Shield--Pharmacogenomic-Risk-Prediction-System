import React from 'react';
import { ErrorIcon, CheckCircleIcon, InfoIcon, CloseIcon } from './Icons';

export interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose?: () => void;
  title?: string;
  details?: React.ReactNode;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  onClose,
  title,
  details,
}) => {
  const renderIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon />;
      case 'success':
        return <CheckCircleIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  return (
    <div className={`error-message ${type}`}>
      <div className="error-header">
        <span className="error-icon">{renderIcon()}</span>
        {title && <h4 className="error-title">{title}</h4>}
      </div>
      <p className="error-text">{message}</p>
      {details && <div className="error-details">{details}</div>}
      {onClose && (
        <button
          className="btn-close"
          onClick={onClose}
          type="button"
          aria-label="Close notification"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};
