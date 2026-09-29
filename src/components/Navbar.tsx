import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogoIcon } from './Icons';

export const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/">
          <LogoIcon className="logo-icon" />
          <span>PharmaGuard</span>
        </Link>
        <div className="navbar-links">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/"
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/vcf-upload"
          >
            Upload
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/drug-input"
          >
            Medications
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/results-display"
          >
            Results
          </NavLink>
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/export-share"
          >
            Export
          </NavLink>
        </div>
        <div className="navbar-actions" />
      </div>
    </nav>
  );
};
