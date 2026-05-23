import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthSession } from '../services/auth';
import logo from '../assets/logo.png';

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
          <img src={logo} alt="Applyr Logo" className='logo'/>
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