import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthSession } from '../services/auth';
import logo from '../assets/logo.png';

type NavbarProps = {
  authSession: AuthSession | null
  onLogout: () => void
}

const getBreadcrumb = (pathname: string) => {
  if (pathname === '/') {
    return ['Dashboard']
  }

  if (pathname.startsWith('/profile')) {
    return ['Dashboard', 'My Profile']
  }

  if (pathname.startsWith('/applicant')) {
    return ['Dashboard', 'Applicant Info']
  }

  if (pathname.startsWith('/editor')) {
    return ['Dashboard', 'Applicant Info', 'Editor']
  }

  return ['Dashboard']
}

const Navbar = ({ authSession, onLogout }: NavbarProps) => {
  const location = useLocation()
  const breadcrumb = getBreadcrumb(location.pathname)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Sliding Indicator Refs & State ---
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0, opacity: 0 });

  // Calculate active link position on route change
  useEffect(() => {
    // setTimeout ensures the DOM updates the '.active' class first
    const timer = setTimeout(() => {
      if (navLinksRef.current) {
        const activeLink = navLinksRef.current.querySelector('.nav-link.active') as HTMLElement;
        if (activeLink) {
          setIndicatorStyle({
            width: activeLink.offsetWidth,
            left: activeLink.offsetLeft,
            opacity: 1
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

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

  const getInitials = () => {
    if (!authSession) return ''
    if (authSession.user.name) {
      return authSession.user.name.charAt(0).toUpperCase()
    }
    return authSession.user.email.charAt(0).toUpperCase()
  }

  const displayName = authSession?.user.name || authSession?.user.email.split('@')[0]

  return (
    <nav className="global-navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand-link">
          <img src={logo} alt="Applyr Logo" className="logo" />
        </Link>
      </div>

      <div className="navbar-middle">
        <div className="navbar-links" aria-label="Primary" ref={navLinksRef}>
          {/* The sliding background pill */}
          <div 
            className="nav-indicator" 
            style={{
              width: `${indicatorStyle.width}px`,
              transform: `translateX(${indicatorStyle.left}px)`,
              opacity: indicatorStyle.opacity
            }} 
          />
          
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link to="/profile" className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}>
            My Profile
          </Link>
          <Link to="/applicant" className={`nav-link ${location.pathname.startsWith('/applicant') || location.pathname.startsWith('/editor') ? 'active' : ''}`}>
            Applicant Info
          </Link>
        </div>
        {/* <p className="navbar-breadcrumb" aria-live="polite">
          {breadcrumb.join(' / ')}
        </p> */}
      </div>

      <div className="navbar-actions">
        {authSession ? (
          <div className="navbar-account">
            <div className="profile-chip" aria-hidden="true">
              {getInitials()}
            </div>
            <div className="account-meta">
              <p className="account-name">{displayName}</p>
              <p className="account-email">{authSession.user.email}</p>
            </div>
            <button type="button" className="logout-button" onClick={onLogout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="navbar-auth-links">
            <span className="navbar-greeting">Welcome</span>
          </div>
        )}
      </div>

      <div className="mobile_navbar-actions">
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
                <Link to="/profile" className="dropdown-item">My Profile</Link>
                <Link to="/applicant" className="dropdown-item">Applicant Info</Link>
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
          
          </div>
        ) : (
          <div className="navbar-auth-links">
            <span className="navbar-greeting">Welcome</span>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar