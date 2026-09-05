import React, { useState, useEffect, useRef } from 'react';
import StatCard from './StatCard';
import { animatePageEntrance, animateStatCards, animateTableRows } from '../utils/animations';
import { fetchFacultyDashboard, fetchFacultyPayments } from '../api';

const parseAmountNumber = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export default function FacultyPaymentHistory() {
  const containerRef = useRef(null);
  const panelsRef = useRef(null);
  const tableRef = useRef(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultPayments = [
    { id: 101, payment_date: 'Jul 15, 2026', type: 'Monthly Contribution Dues', refNo: 'REF-2026-094', amount: '₱ 500.00', status: 'Verified' },
    { id: 102, payment_date: 'Jun 10, 2026', type: 'Special Assessment Fee', refNo: 'REF-2026-088', amount: '₱ 300.00', status: 'Verified' },
    { id: 103, payment_date: 'Aug 01, 2026', type: 'Monthly Contribution Dues', refNo: 'REF-2026-102', amount: '₱ 500.00', status: 'To verify' }
  ];

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

        if (combined.length > 0) {
          setPayments(combined);
        } else {
          setPayments(defaultPayments);
        }
      } catch (err) {
        const localPayments = JSON.parse(localStorage.getItem('ucare_submitted_payments') || '[]');
        setPayments(localPayments.length > 0 ? localPayments : defaultPayments);
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
    if (tableRef.current && !loading) {
      animateTableRows(tableRef.current);
    }
  }, [loading]);

  const totalPaid = dashboardData?.total_contributions || 28500;

  // Calculate unverified amount safely using parseAmountNumber
  const pendingAmount = payments
    .filter(p => p.status !== 'Verified' && p.status !== 'Completed')
    .reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);

  const pendingCount = payments.filter(p => p.status !== 'Verified' && p.status !== 'Completed').length;

  const chartLabels = (dashboardData?.chart_labels && Array.isArray(dashboardData.chart_labels) && dashboardData.chart_labels.length > 0)
    ? dashboardData.chart_labels
    : ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  const contributionsChart = (dashboardData?.contributions_chart && Array.isArray(dashboardData.contributions_chart) && dashboardData.contributions_chart.length > 0)
    ? dashboardData.contributions_chart
    : [4000, 4500, 5000, 4800, 5200, 5000];

  const formatCurrency = (val) => '₱ ' + Number(parseAmountNumber(val)).toLocaleString('en-US', { minimumFractionDigits: 2 });
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="main-content" ref={containerRef}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>Payment history</h1>
          <p>Personal record of all your faculty union contributions and payments</p>
        </div>
      </div>

      {/* Two Summary Cards */}
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

      {/* Payment Entries Table */}
      <div className="recent-activity-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="panel-header" style={{ padding: '20px 24px 0 24px' }}>
          <h2>Payment Log Entries</h2>
        </div>

        {/* Swipeable Responsive Table Container */}
        <div className="table-responsive" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch', border: 'none' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ⏳ Loading payment history...
            </div>
          ) : (
            <table className="data-table" ref={tableRef} style={{ width: '100%', minWidth: '680px' }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Type</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Reference #</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Amount</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length > 0 ? (
                  payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.payment_date || p.date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text-main)' }}>{p.type || p.payment_method || 'Contribution'}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}><span className="ref-code">{p.refNo || p.reference_no || `PAY-${p.id}`}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}><strong className="amount-text">{formatCurrency(p.amount)}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`status-tag ${p.status === 'Verified' || p.status === 'Completed' ? 'approved' : p.status === 'To verify' || p.status === 'Pending' ? 'pending' : 'declined'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
