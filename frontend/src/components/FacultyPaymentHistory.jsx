import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const parsePaymentDate = (p) => {
  const raw = p.payment_date || p.date || p.created_at;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
    const yMatch = raw.match(/\b(20\d\d)\b/);
    if (yMatch) return new Date(parseInt(yMatch[1], 10), 0, 1);
  } else if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw;
  }
  return null;
};

const getPaymentYear = (p) => {
  const d = parsePaymentDate(p);
  return d ? d.getFullYear() : null;
};

const formatCurrency = (val) => '₱ ' + Number(parseAmountNumber(val)).toLocaleString('en-US', { minimumFractionDigits: 2 });

const formatDate = (dateStr) => {
  if (!dateStr) return 'Recent';
  const d = parsePaymentDate({ payment_date: dateStr });
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateStr;
};

export default function FacultyPaymentHistory() {
  const containerRef = useRef(null);
  const panelsRef = useRef(null);
  const tableRef = useRef(null);
  const yearDropdownRef = useRef(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Year and Date Range Filter States
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'year' | 'year_range' | 'custom_date'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [fromYear, setFromYear] = useState(2024);
  const [toYear, setToYear] = useState(2026);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showYearDropdown, setShowYearDropdown] = useState(false);

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
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute available years (including 2024, 2025, 2026, 2027 and any years from payments data)
  const { availableYears, yearsAscending } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([2024, 2025, 2026, 2027]);
    if (currentYear > 2027) {
      for (let y = 2028; y <= currentYear; y++) yearSet.add(y);
    }
    payments.forEach(p => {
      const y = getPaymentYear(p);
      if (y) yearSet.add(y);
    });
    const yearsDesc = Array.from(yearSet).sort((a, b) => b - a);
    const yearsAsc = Array.from(yearSet).sort((a, b) => a - b);
    return { availableYears: yearsDesc, yearsAscending: yearsAsc };
  }, [payments]);

  // Handle outside click & escape key for the year filter dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
        setShowYearDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowYearDropdown(false);
    };
    if (showYearDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showYearDropdown]);

  useEffect(() => {
    if (containerRef.current) {
      animatePageEntrance(containerRef.current);
    }
    if (panelsRef.current && !loading) {
      animateStatCards(panelsRef.current);
    }
  }, [loading]);

  // Filter payments based on selected year or range
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filterMode === 'all') return true;

      const pYear = getPaymentYear(p);
      const pDate = parsePaymentDate(p);

      if (filterMode === 'year') {
        return pYear === Number(selectedYear);
      }

      if (filterMode === 'year_range') {
        if (!pYear) return false;
        const minYear = Math.min(Number(fromYear), Number(toYear));
        const maxYear = Math.max(Number(fromYear), Number(toYear));
        return pYear >= minYear && pYear <= maxYear;
      }

      if (filterMode === 'custom_date') {
        if (!pDate) return false;
        if (fromDate) {
          const start = new Date(fromDate + 'T00:00:00');
          if (pDate < start) return false;
        }
        if (toDate) {
          const end = new Date(toDate + 'T23:59:59');
          if (pDate > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [payments, filterMode, selectedYear, fromYear, toYear, fromDate, toDate]);

  // Animate table rows on filter change
  useEffect(() => {
    if (tableRef.current && !loading) {
      animateTableRows(tableRef.current);
    }
  }, [loading, filterMode, selectedYear, fromYear, toYear, fromDate, toDate]);

  // Reset filter back to 'All Years'
  const handleResetFilter = () => {
    setFilterMode('all');
    setSelectedYear(2026);
    setFromYear(2024);
    setToYear(2026);
    setFromDate('');
    setToDate('');
    setShowYearDropdown(false);
  };

  // Label generator for active filter
  const getFilterLabel = () => {
    if (filterMode === 'all') return 'All Years';
    if (filterMode === 'year') return `Year ${selectedYear}`;
    if (filterMode === 'year_range') {
      const minYear = Math.min(Number(fromYear), Number(toYear));
      const maxYear = Math.max(Number(fromYear), Number(toYear));
      return minYear === maxYear ? `Year ${minYear}` : `${minYear} – ${maxYear}`;
    }
    if (filterMode === 'custom_date') {
      if (fromDate && toDate) return `${fromDate} to ${toDate}`;
      if (fromDate) return `From ${fromDate}`;
      if (toDate) return `Until ${toDate}`;
      return 'Custom Date Range';
    }
    return 'All Years';
  };

  // Financial calculations
  const allTimeTotalPaid = dashboardData?.total_contributions != null ? dashboardData.total_contributions : 0;
  const allTimePendingAmount = payments
    .filter(p => p.status !== 'Verified' && p.status !== 'Completed')
    .reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);
  const allTimePendingCount = payments.filter(p => p.status !== 'Verified' && p.status !== 'Completed').length;

  const filteredTotalAmount = filteredPayments.reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);
  const filteredVerifiedAmount = filteredPayments
    .filter(p => p.status === 'Verified' || p.status === 'Completed')
    .reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);
  const filteredPendingAmount = filteredPayments
    .filter(p => p.status !== 'Verified' && p.status !== 'Completed')
    .reduce((sum, p) => sum + parseAmountNumber(p.amount), 0);
  const filteredPendingCount = filteredPayments.filter(p => p.status !== 'Verified' && p.status !== 'Completed').length;
  const filteredVerifiedCount = filteredPayments.filter(p => p.status === 'Verified' || p.status === 'Completed').length;

  // StatCard values reflect active filter if specified
  const displayTotalPaid = filterMode === 'all' ? allTimeTotalPaid : filteredVerifiedAmount;
  const displayPendingAmount = filterMode === 'all' ? allTimePendingAmount : filteredPendingAmount;
  const displayPendingCount = filterMode === 'all' ? allTimePendingCount : filteredPendingCount;

  const chartLabels = (dashboardData?.chart_labels && Array.isArray(dashboardData.chart_labels) && dashboardData.chart_labels.length > 0)
    ? dashboardData.chart_labels
    : ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  const contributionsChart = (dashboardData?.contributions_chart && Array.isArray(dashboardData.contributions_chart) && dashboardData.contributions_chart.length > 0)
    ? dashboardData.contributions_chart
    : [0, 0, 0, 0, 0, 0];

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
          value={loading ? '...' : formatCurrency(displayTotalPaid)}
          subtitle={filterMode === 'all' ? 'All-time verified union payments' : `Verified contributions for ${getFilterLabel()}`}
          trendText={filterMode === 'all' ? 'All Time' : getFilterLabel()}
          trendPositive={true}
          chartType="bar"
          data={contributionsChart}
          labels={chartLabels}
        />

        <StatCard
          headerTitle="TO BE VERIFIED"
          value={loading ? '...' : formatCurrency(displayPendingAmount)}
          subtitle={filterMode === 'all' ? 'Recent payment remittance awaiting admin verification' : `Pending verification for ${getFilterLabel()}`}
          trendText={`${displayPendingCount} Pending`}
          trendPositive={displayPendingCount === 0}
          chartType="area"
          isMainFocus={true}
          data={contributionsChart}
          labels={chartLabels}
        />
      </div>

      {/* Payment Entries Table Panel */}
      <div className="recent-activity-panel" style={{ padding: '0', overflow: 'visible', position: 'relative' }}>
        {/* Panel Header with Title and Year Filter Dropdown Button */}
        <div className="panel-header" style={{ padding: '20px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Payment Log Entries</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {filterMode === 'all' 
                ? 'Showing all recorded union contributions and transactions' 
                : `Filtered contributions for ${getFilterLabel()}`}
            </p>
          </div>

          {/* Filter Controls Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Year Dropdown Filter Button */}
            <div className="dashboard-year-filter" ref={yearDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-categories"
                onClick={() => setShowYearDropdown(prev => !prev)}
                aria-label="Filter payments by year or date range"
                style={{
                  borderColor: filterMode !== 'all' ? 'var(--primary-maroon)' : undefined,
                  backgroundColor: filterMode !== 'all' ? '#FDF2F5' : undefined,
                  color: filterMode !== 'all' ? 'var(--primary-maroon)' : undefined
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{getFilterLabel()}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: showYearDropdown ? 'rotate(180deg)' : 'none',
                    transition: 'transform var(--transition-fast)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showYearDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    width: '230px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 1000
                  }}
                >
                  <div style={{ padding: '8px 16px 4px 16px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Select Year
                  </div>

                  {/* Option: All Years */}
                  <div
                    className={`dropdown-item ${filterMode === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterMode('all');
                      setShowYearDropdown(false);
                    }}
                  >
                    <span>All Years</span>
                    {filterMode === 'all' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>

                  {/* Individual Years: 2024, 2025, 2026, ... */}
                  {availableYears.map(yr => (
                    <div
                      key={yr}
                      className={`dropdown-item ${filterMode === 'year' && Number(selectedYear) === yr ? 'active' : ''}`}
                      onClick={() => {
                        setFilterMode('year');
                        setSelectedYear(yr);
                        setShowYearDropdown(false);
                      }}
                    >
                      <span>Year {yr}</span>
                      {filterMode === 'year' && Number(selectedYear) === yr && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}

                  <div style={{ height: '1px', background: 'var(--border-light)', margin: '6px 0' }} />

                  <div style={{ padding: '4px 16px 4px 16px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Range Filter
                  </div>

                  {/* Option: Year Range (From this year to this year) */}
                  <div
                    className={`dropdown-item ${filterMode === 'year_range' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterMode('year_range');
                      setShowYearDropdown(false);
                    }}
                  >
                    <span>Year Range (From – To)</span>
                    {filterMode === 'year_range' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>

                  {/* Option: Specific Date Range */}
                  <div
                    className={`dropdown-item ${filterMode === 'custom_date' ? 'active' : ''}`}
                    onClick={() => {
                      setFilterMode('custom_date');
                      setShowYearDropdown(false);
                    }}
                  >
                    <span>Specific Date Range...</span>
                    {filterMode === 'custom_date' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clear / Reset Filter Button */}
            {filterMode !== 'all' && (
              <button
                type="button"
                onClick={handleResetFilter}
                style={{
                  background: '#FFFFFF',
                  border: '1px dashed var(--primary-maroon)',
                  borderRadius: 'var(--radius-md)',
                  height: '44px',
                  padding: '0 14px',
                  color: 'var(--primary-maroon)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-xs)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDF2F5'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                title="Reset filter to view all years"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Extended Year Range Sub-Bar (When Year Range is active) */}
        {filterMode === 'year_range' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              padding: '12px 24px',
              backgroundColor: '#FAF5F6',
              borderTop: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--primary-maroon)' }}>
                From Year:
              </label>
              <select
                className="form-select"
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem', minWidth: '100px' }}
              >
                {yearsAscending.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--primary-maroon)' }}>
                To Year:
              </label>
              <select
                className="form-select"
                value={toYear}
                onChange={(e) => setToYear(Number(e.target.value))}
                style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem', minWidth: '100px' }}
              >
                {yearsAscending.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              (Filtering contributions from Jan 1, {Math.min(fromYear, toYear)} to Dec 31, {Math.max(fromYear, toYear)})
            </span>
          </div>
        )}

        {/* Extended Specific Date Range Sub-Bar (When Custom Date is active) */}
        {filterMode === 'custom_date' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              padding: '12px 24px',
              backgroundColor: '#FAF5F6',
              borderTop: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--primary-maroon)' }}>
                From Date:
              </label>
              <input
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: '36px', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--primary-maroon)' }}>
                To Date:
              </label>
              <input
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: '36px', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}

        {/* Contribution Summary Strip for the Active Range */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>Period:</span>
            <span
              style={{
                backgroundColor: 'rgba(139, 30, 63, 0.08)',
                color: 'var(--primary-maroon)',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem'
              }}
            >
              {getFilterLabel()}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              ({filteredPayments.length} {filteredPayments.length === 1 ? 'record' : 'records'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Total Contributions:</span>
              <strong style={{ color: 'var(--primary-maroon)', fontSize: '1.05rem' }}>
                {formatCurrency(filteredTotalAmount)}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BBF7D0', fontWeight: '600' }}>
                {formatCurrency(filteredVerifiedAmount)} Verified
              </span>
              {filteredPendingAmount > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#B47806', backgroundColor: '#FEF8E7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FCE8B3', fontWeight: '600' }}>
                  {formatCurrency(filteredPendingAmount)} Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Swipeable Responsive Table Container */}
        <div
          className="table-responsive"
          style={{
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
            border: 'none',
            borderBottomLeftRadius: 'var(--radius-md)',
            borderBottomRightRadius: 'var(--radius-md)'
          }}
        >
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
                {filteredPayments.length > 0 ? (
                  filteredPayments.map(p => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.payment_date || p.date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--text-main)' }}>{p.type || p.payment_method || 'Contribution'}</strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="ref-code">{p.refNo || p.reference_no || `PAY-${p.id}`}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong className="amount-text">{formatCurrency(p.amount)}</strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`status-tag ${p.status === 'Verified' || p.status === 'Completed' ? 'approved' : p.status === 'To verify' || p.status === 'Pending' ? 'pending' : 'declined'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '4px' }}>
                        No payment records found for {getFilterLabel()}
                      </div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                        There are no recorded contributions matching your selected time period.
                      </div>
                      {filterMode !== 'all' && (
                        <button
                          type="button"
                          className="btn-categories"
                          onClick={handleResetFilter}
                          style={{ height: '36px', padding: '0 16px', fontSize: '0.82rem', margin: '0 auto' }}
                        >
                          Show All Years
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer with Summary for Filtered Contributions */}
              {filteredPayments.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: '700' }}>
                    <td colSpan="3" style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                      Total Contributions ({getFilterLabel()})
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong className="amount-text" style={{ fontSize: '1rem', color: 'var(--primary-maroon)' }}>
                        {formatCurrency(filteredTotalAmount)}
                      </strong>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {filteredPayments.length} entries ({filteredVerifiedCount} verified)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

