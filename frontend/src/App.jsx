import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import PendingBenefitsCard from './components/PendingBenefitsCard';
import RecentPaymentsTable from './components/RecentPaymentsTable';
import ManageMembersPage from './components/ManageMembersPage';
import ManagePaymentsPage from './components/ManagePaymentsPage';
import ManageBenefitTypesPage from './components/ManageBenefitTypesPage';
import ApproveBenefitRequestsPage from './components/ApproveBenefitRequestsPage';
import GenerateReportsPage from './components/GenerateReportsPage';
import AnnouncementsPage from './components/AnnouncementsPage';
import FacultyPanel from './components/FacultyPanel';
import LoginPage from './components/LoginPage';
import { fetchDashboard, fetchBenefitRequests, getUser, clearAuth, fetchCurrentUser } from './api';
import { animatePageEntrance, animateStatCards } from './utils/animations';
import './App.css';

function AdminHomeContent({ onNavigate }) {
  const containerRef    = useRef(null);
  const panelsRef       = useRef(null);
  const yearDropdownRef = useRef(null);

  const [dash,             setDash]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [selectedYear,     setSelectedYear]     = useState(() => new Date().getFullYear().toString());
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  useEffect(() => {
    fetchDashboard(selectedYear)
      .then(data => {
        setDash(data);
        setError(null);
      })
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  useEffect(() => {
    if (!loading && containerRef.current) animatePageEntrance(containerRef.current);
  }, [loading]);

  useEffect(() => {
    if (!loading && panelsRef.current) animateStatCards(panelsRef.current);
  }, [loading, selectedYear]);

  // Close year dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
        setShowYearDropdown(false);
      }
    };
    if (showYearDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showYearDropdown]);

  // ── Derive chart/stat values from API response ──────────────
  const currentYearInt         = new Date().getFullYear();
  const availableYears         = dash?.available_years?.length
    ? dash.available_years
    : [currentYearInt, currentYearInt - 1, currentYearInt - 2];
  const totalContributions     = dash?.total_contributions      ?? 0;
  const thisMonthContributions = dash?.this_month_contributions ?? 0;
  const currentMonthLabel      = dash?.current_month_label      ?? '';
  const cumulativeData         = dash?.cumulative_chart?.data   ?? [0, 0, 0, 0, 0, 0];
  const cumulativeLabels       = dash?.cumulative_chart?.labels ?? ['', '', '', '', '', ''];
  const monthlyData            = dash?.monthly_chart?.data      ?? [0, 0, 0, 0, 0, 0];
  const monthlyLabels          = dash?.monthly_chart?.labels    ?? ['', '', '', '', '', ''];

  const formatPHP = (val) =>
    '₱ ' + Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <main className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <h1>Secretary-Admin Dashboard</h1>
            <p>Loading data…</p>
          </div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          ⏳ Fetching live dashboard statistics…
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" ref={containerRef}>
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>Secretary-Admin Dashboard</h1>
          <p>Overview of ISPSC Tagudin Federated Faculty Union contributions and benefit requests</p>
        </div>

        {/* Fiscal Year Filter Dropdown for Stat Cards */}
        <div className="dashboard-year-filter" ref={yearDropdownRef}>
          <button
            type="button"
            className="btn-categories"
            onClick={() => setShowYearDropdown(prev => !prev)}
            aria-label="Select Fiscal Year"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {showYearDropdown && (
            <div className="dropdown-menu">
              {availableYears.map(yr => (
                <div
                  key={yr}
                  className={`dropdown-item ${selectedYear === String(yr) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedYear(String(yr));
                    setShowYearDropdown(false);
                  }}
                >
                  <span>Year {yr}</span>
                  {selectedYear === String(yr) && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              ))}
              <div
                className={`dropdown-item ${selectedYear === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedYear('all');
                  setShowYearDropdown(false);
                }}
              >
                <span>All Years</span>
                {selectedYear === 'all' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="top-panels-grid" ref={panelsRef}>
        <StatCard
          headerTitle={selectedYear === 'all' ? "TOTAL CONTRIBUTIONS (ALL TIME)" : `TOTAL CONTRIBUTIONS (${selectedYear})`}
          value={formatPHP(totalContributions)}
          subtitle={dash?.stat_subtitle || (selectedYear === 'all' ? "All-time overall collected funds" : `Total collected funds in ${selectedYear}`)}
          chartType="bar"
          data={monthlyData}
          labels={monthlyLabels}
          watermark="Monthly Contributions Breakdown"
        />
        <StatCard
          headerTitle={selectedYear === 'all' || selectedYear === String(currentYearInt) ? "CONTRIBUTION THIS MONTH" : `ANNUAL TOTAL (${selectedYear})`}
          value={formatPHP(thisMonthContributions)}
          subtitle={dash?.month_subtitle || `${currentMonthLabel} faculty union contribution activity`}
          chartType="area"
          isMainFocus={true}
          data={monthlyData}
          labels={monthlyLabels}
          watermark="Monthly Activity Trend"
        />
        <PendingBenefitsCard onNavigate={onNavigate} />
      </div>

      <RecentPaymentsTable onNavigate={onNavigate} />
    </main>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [activeTab, setActiveTab] = useState('Home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  // Sync user profile from backend on load (e.g. to pull latest profile photo and details)
  useEffect(() => {
    fetchCurrentUser().then((freshUser) => {
      if (freshUser) setCurrentUser(freshUser);
    });

    const handleUserUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      } else {
        const stored = getUser();
        if (stored) setCurrentUser(stored);
      }
    };

    window.addEventListener('ucare_user_updated', handleUserUpdated);
    return () => window.removeEventListener('ucare_user_updated', handleUserUpdated);
  }, []);

  useEffect(() => {
    const syncPendingCount = async () => {
      try {
        const res = await fetchBenefitRequests({ status: 'Pending' });
        setPendingCount((res?.data || []).length);
      } catch (e) {}
    };

    if (currentUser && currentUser.role === 'admin') {
      syncPendingCount();
    }

    window.addEventListener('ucare_requests_updated', syncPendingCount);
    return () => window.removeEventListener('ucare_requests_updated', syncPendingCount);
  }, [currentUser]);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setActiveTab('Home');
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
  };

  // 1) Unauthenticated -> Show Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} onLoginSuccess={handleLogin} />;
  }

  // 2) Faculty user -> Render Adaptive Faculty Panel
  if (currentUser.role === 'faculty') {
    return <FacultyPanel currentUser={currentUser} onLogout={handleLogout} />;
  }

  // 3) Admin user -> Render Secretary-Admin Dashboard
  const navbarConfig = {
    systemTitle: 'ISPSC Tagudin Federated Faculty Union',
    systemSubtitle: 'Compensation & Assistance Records Engine',
    userName: currentUser?.name ?? 'Sec. Administrator',
    userRole: 'Faculty Union Admin',
    roleBadge: 'SYSTEM ADMIN',
    userPhoto: currentUser?.profile_photo_url || currentUser?.profile_photo || null,
    onLogout: handleLogout,
    onMenuToggle: () => setSidebarOpen(v => !v),
    onNavigate: setActiveTab
  };

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'Manage Members':
        return <ManageMembersPage />;
      case 'Manage Payments':
        return <ManagePaymentsPage />;
      case 'Manage Benefit Types':
        return <ManageBenefitTypesPage />;
      case 'Approve Benefit Requests':
        return <ApproveBenefitRequestsPage />;
      case 'Announcements':
        return <AnnouncementsPage />;
      case 'Generate Reports':
        return <GenerateReportsPage />;
      case 'Home':
      default:
        return <AdminHomeContent onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar {...navbarConfig} />

      <div className="app-body">
        <Sidebar
          activeItem={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pendingCount={pendingCount}
          onSignOut={() => window.dispatchEvent(new CustomEvent('ucare_open_signout_modal'))}
        />
        {renderAdminContent()}
      </div>
    </div>
  );
}
