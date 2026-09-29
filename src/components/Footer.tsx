import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-top">
        <div className="footer-section links-section">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/vcf-upload">Upload Genomics</Link>
            </li>
            <li>
              <Link to="/drug-input">Medications</Link>
            </li>
            <li>
              <Link to="/results-display">Analysis Results</Link>
            </li>
            <li>
              <Link to="/export-share">Export</Link>
            </li>
          </ul>
        </div>
        <div className="footer-section contact-section">
          <h4>Contact Us</h4>
          <p>Email: support@pharmaguard.ai</p>
          <p>Phone: +1 (555) 123-4567</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 PharmaGuard AI. All rights reserved.</p>
      </div>
    </footer>
  );
};
