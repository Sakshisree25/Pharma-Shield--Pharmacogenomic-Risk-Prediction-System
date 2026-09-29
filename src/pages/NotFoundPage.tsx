import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      className="results-container animate-fade-in"
      style={{ padding: '3rem 0', textAlign: 'center' }}
    >
      <div className="results-header" style={{ justifyContent: 'center' }}>
        <h2>Page Not Found</h2>
        <p className="results-count">
          The page you’re looking for doesn’t exist.
        </p>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <Link className="btn btn-primary btn-new-analysis" to="/">
          Go Home
        </Link>
      </div>
    </div>
  );
};
