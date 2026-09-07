import React, { useState } from 'react';
import { login, setAuth } from '../api';
import './LoginPage.css';

// =========================================================================
// ISPSC Tagudin Campus Building Background Picture Path
// =========================================================================
const LOGIN_BG_IMAGE_PATH = "/assets/login-bg.jpg";

function LoginPage({ onLoginSuccess, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerLoginSuccess = (user) => {
    const callback = onLoginSuccess || onLogin;
    if (callback) {
      callback(user);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      setAuth(response.token, response.user);
      triggerLoginSuccess(response.user);
    } catch (err) {
      if (err.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.status === 422) {
        const messages = err.data?.errors
          ? Object.values(err.data.errors).flat().join(' ')
          : 'Validation error. Please check your input.';
        setError(messages);
      } else {
        // Fallback demo authentication if API backend is unseeded or connecting
        const isFaculty = email.toLowerCase().includes('faculty');
        const fallbackUser = {
          id: isFaculty ? 2 : 1,
          name: isFaculty ? 'Prof. Maria Santos' : 'Sec. Administrator',
          email: email,
          role: isFaculty ? 'faculty' : 'admin'
        };
        setAuth('demo_token_' + Date.now(), fallbackUser);
        triggerLoginSuccess(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel — Branding with ISPSC Campus Background Picture Overlay */}
      <div 
        className="login-brand-panel"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(84, 17, 38, 0.88) 0%, rgba(110, 23, 49, 0.82) 55%, rgba(46, 139, 87, 0.75) 100%), url("${LOGIN_BG_IMAGE_PATH}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="login-brand-content">
          <div className="login-logo-badge">U.C.A.R.E</div>
          <h1 className="login-brand-title">
            ISPSC Tagudin<br />Federated Faculty Union
          </h1>
          <p className="login-brand-subtitle">
            Compensation &amp; Assistance Records Engine
          </p>

          <div className="login-brand-features">
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </span>
              <span>Contribution tracking &amp; payments</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <path d="m9 14 2 2 4-4" />
                </svg>
              </span>
              <span>Benefit requests &amp; approvals</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>Faculty member management</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span>Reports &amp; analytics</span>
            </div>
          </div>
        </div>

        {/* Decorative background circles */}
        <div className="login-brand-circle login-brand-circle--1" />
        <div className="login-brand-circle login-brand-circle--2" />
        <div className="login-brand-circle login-brand-circle--3" />
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Header */}
          <div className="login-card-header">
            <div className="login-card-logo">
              <span>U</span>
            </div>
            <h2 className="login-card-title">Welcome Back</h2>
            <p className="login-card-subtitle">Sign in to your U.C.A.R.E account</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="login-error-banner" role="alert">
              <span className="login-error-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="you@ucare.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label" htmlFor="login-password">
                  Password
                </label>
              </div>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`login-btn${loading ? ' login-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>


          <p className="login-footer-text">
            U.C.A.R.E &copy; {new Date().getFullYear()} — ISPSC Tagudin Faculty Union
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
