import React, { useEffect, useRef, useState } from 'react';
import StatCard from './StatCard';
import { animatePageEntrance, animateStatCards } from '../utils/animations';
import { fetchFacultyDashboard, fetchFacultyPayments, resolvePhotoUrl } from '../api';

const parseAmountNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val) => '₱ ' + Number(parseAmountNumber(val)).toLocaleString('en-US', { minimumFractionDigits: 2 });

const getInitials = (nameStr, fallback = 'FM') => {
  if (!nameStr || typeof nameStr !== 'string') return fallback;
  const parts = nameStr.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts.map(n => n[0]).join('').substring(0, 2).toUpperCase() || fallback;
};

export default function FacultyHome({ currentUser, onNavigate }) {
  const user = {
    name: currentUser?.name || 'Prof. Maria Santos',
    email: currentUser?.email || 'faculty@ucare.local',
    ...currentUser
  };

  const containerRef = useRef(null);
  const panelsRef = useRef(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashRes, payRes] = await Promise.all([
          fetchFacultyDashboard().catch(() => null),
          fetchFacultyPayments().catch(() => null)
        ]);
        if (dashRes) setDashboardData(dashRes);

        const localPayments = JSON.parse(localStorage.getItem('ucare_submitted_payments') || '[]');
        const apiPayments = payRes?.data || [];
        const combined = [...localPayments, ...apiPayments];
        setPayments(combined);
      } catch (err) {
        console.error("Failed to load faculty dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      animatePageEntrance(containerRef.current);
    }
    if (panelsRef.current && !loading) {
      animateStatCards(panelsRef.current);
    }
  }, [loading]);

  // Provide robust calculations matching Payment History stat cards
  const totalPaid = dashboardData?.total_contributions != null ? dashboardData.total_contributions : 0;

  const pendingAmount = payments
    .filter(p => p.status !== 'Verified' && p.status !== 'Completed')
    .reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);

  const pendingCount = payments.filter(p => p.status !== 'Verified' && p.status !== 'Completed').length;

  const recentRequests = Array.isArray(dashboardData?.recent_requests) ? dashboardData.recent_requests : [];

  const recentPayments = (payments.length > 0)
    ? payments.slice(0, 3).map(p => ({
        id: p.id,
        type: p.type || p.payment_method || 'Monthly Dues',
        date: p.payment_date || p.date || 'Recent',
        refNo: p.refNo || p.reference_no || `PAY-${p.id}`,
        amount: typeof p.amount === 'number' ? formatCurrency(p.amount) : (String(p.amount).includes('₱') ? p.amount : formatCurrency(parseAmountNumber(p.amount))),
        status: p.status
      }))
    : (Array.isArray(dashboardData?.recent_payments) ? dashboardData.recent_payments : []);
  
  const chartLabels = (dashboardData?.chart_labels && Array.isArray(dashboardData.chart_labels) && dashboardData.chart_labels.length > 0)
    ? dashboardData.chart_labels
    : ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  const contributionsChart = (dashboardData?.contributions_chart && Array.isArray(dashboardData.contributions_chart) && dashboardData.contributions_chart.length > 0)
    ? dashboardData.contributions_chart
    : [0, 0, 0, 0, 0, 0];

  const photoUrl = resolvePhotoUrl(user.profile_photo_url || user.profile_photo);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [user.profile_photo_url, user.profile_photo]);

  return (
    <main className="main-content" ref={containerRef}>
      {/* Page Header / Profile Summary Row */}
      <div className="faculty-profile-header-card">
        <div 
          className="faculty-avatar-large"
          style={{
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: onNavigate ? 'pointer' : 'default',
            border: '2px solid #F4B942',
            boxShadow: '0 4px 14px rgba(139, 30, 63, 0.3)'
          }}
          onClick={() => onNavigate && onNavigate('Profile')}
          title="Click to view and edit profile"
        >
          {photoUrl && !photoError ? (
            <img 
              src={photoUrl} 
              alt={user.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={() => setPhotoError(true)}
            />
          ) : (
            user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'FM'
          )}
        </div>
        <div className="faculty-profile-info">
          <div className="faculty-profile-name">{user.name}</div>
          <div className="faculty-profile-role">Faculty Member • ISPSC Tagudin Campus</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Faculty Union Portal
          </div>
        </div>
      </div>

      {/* Summary Cards Row - Matches Payment History */}
      <div className="top-panels-grid top-panels-grid--two-col" ref={panelsRef}>
        <StatCard
          headerTitle="TOTAL PAID"
          value={loading ? '...' : formatCurrency(totalPaid)}
          subtitle="All-time verified union payments"
          trendText="Verified"
          trendPositive={true}
          chartType="bar"
          data={contributionsChart}
          labels={chartLabels}
        />

        <StatCard
          headerTitle="TO BE VERIFIED"
          value={loading ? '...' : formatCurrency(pendingAmount)}
          subtitle="Recent payment remittance awaiting admin verification"
          trendText={`${pendingCount} Pending`}
          trendPositive={pendingCount === 0}
          chartType="area"
          isMainFocus={true}
          data={contributionsChart}
          labels={chartLabels}
        />
      </div>

      {/* Side-by-side (Laptop) / Stacked (Phone) Content Grid */}
      <div className="faculty-home-split-grid">
        {/* Assistance Requests Section */}
        <div className="recent-activity-panel">
          <div className="panel-header">
            <h2>My Assistance Requests</h2>
            <button 
              className="view-all-link" 
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('My assistance requests')}
            >
              View all &gt;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentRequests.length > 0 ? (
              recentRequests.map(req => (
                <div key={req.id} className="pending-list-item">
                  <div className="item-left">
                    <span className="item-member" style={{ fontSize: '0.95rem' }}>{req.type}</span>
                    <span className="item-benefit">Filed: {req.date} • {req.amount}</span>
                  </div>
                  <span className={`status-tag ${req.status === 'Pending' || req.status === 'To verify' ? 'pending' : req.status === 'Approved' ? 'released' : 'declined'}`}>
                    {req.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>
                No recent assistance requests found.
              </div>
            )}
          </div>
        </div>

        {/* Payment Remittance History Section */}
        <div className="recent-activity-panel">
          <div className="panel-header">
            <h2>Recent Payment Remittances</h2>
            <button 
              className="view-all-link" 
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('Payment history')}
            >
              View history &gt;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentPayments.length > 0 ? (
              recentPayments.map(p => (
                <div key={p.id} className="pending-list-item">
                  <div className="item-left">
                    <span className="item-member" style={{ fontSize: '0.95rem' }}>{p.type}</span>
                    <span className="item-benefit">Paid: {p.date} • <strong style={{ color: 'var(--primary-maroon)' }}>{p.amount}</strong></span>
                  </div>
                  <span className={`status-tag ${p.status === 'Verified' || p.status === 'Completed' ? 'verified' : p.status === 'Pending' || p.status === 'To verify' ? 'to-verify' : 'declined'}`} style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                    {p.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '16px 0' }}>
                No recent payment remittances recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
