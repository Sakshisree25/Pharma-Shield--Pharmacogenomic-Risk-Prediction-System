import React from 'react';
import { SpinnerIcon, DnaIcon } from './Icons';

export interface AnalyzeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  onClick,
  disabled,
  isLoading,
}) => {
  return (
    <button
      className={`analyze-btn ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label="Analyze Genetic Risk"
    >
      {isLoading ? (
        <>
          <SpinnerIcon className="animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <DnaIcon />
          <span>Analyze Genetic Risk</span>
        </>
      )}
    </button>
  );
};
