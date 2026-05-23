import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthSession } from '../services/auth';

type NavbarProps = {
  authSession: AuthSession | null;
  onLogout: () => void;
};

const Navbar = ({ authSession, onLogout }: NavbarProps) => {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when navigating
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Helper to get user initials for the avatar
  const getInitials = () => {
    if (!authSession) return '';
    if (authSession.user.name) {
      return authSession.user.name.charAt(0).toUpperCase();
    }
    return authSession.user.email.charAt(0).toUpperCase();
  };

  const displayName = authSession?.user.name || authSession?.user.email.split('@')[0];

  return (
    <nav className="global-navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Applyr
        </Link>
      </div>

      <div className="navbar-actions">
        {authSession ? (
          <div className="navbar-profile" ref={dropdownRef}>
            <button 
              type="button" 
              className="profile-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
            >
              {getInitials()}
            </button>

            {isDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <p className="dropdown-name">{displayName}</p>
                  <p className="dropdown-email">{authSession.user.email}</p>
                </div>
                <div className="dropdown-divider"></div>
                <Link to="/" className="dropdown-item">Dashboard</Link>
                <Link to="/applicant" className="dropdown-item">Applicant</Link>
                <div className="dropdown-divider"></div>
                <button 
                  type="button" 
                  className="dropdown-item logout-item" 
                  onClick={onLogout}
                >
                  Log out
                </button>
              </div>
            )}
            {/* Inline mobile profile (shown only on small viewports) */}
            <div className="profile-dropdown mobile-inline" aria-hidden="true">
              <div className="dropdown-header">
                <p className="dropdown-name">{displayName}</p>
                <p className="dropdown-email">{authSession.user.email}</p>
              </div>
              <div className="dropdown-divider"></div>
              <Link to="/" className="dropdown-item">Dashboard</Link>
              <Link to="/applicant" className="dropdown-item">Applicant</Link>
              <div className="dropdown-divider"></div>
              <button 
                type="button" 
                className="dropdown-item logout-item" 
                onClick={onLogout}
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="navbar-auth-links">
            <span className="navbar-greeting">Welcome</span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;