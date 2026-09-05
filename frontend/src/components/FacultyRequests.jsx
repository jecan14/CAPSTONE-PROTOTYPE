import React, { useState, useEffect, useRef } from 'react';
import { animatePageEntrance, animateTableRows } from '../utils/animations';
import { fetchFacultyRequests } from '../api';

export default function FacultyRequests() {
  const [filter, setFilter] = useState('All');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const tableRef = useRef(null);

  const defaultRequests = [
    { id: 1, type: 'Medical Assistance', date: 'Jul 26, 2026', amount: '₱ 15,000.00', status: 'Pending', notes: 'Hospitalization claim under review.' },
    { id: 2, type: 'Educational Assistance', date: 'May 12, 2026', amount: '₱ 8,500.00', status: 'Approved', notes: 'Conference registration fee reimbursed.' },
    { id: 3, type: 'Bereavement Assistance', date: 'Jan 10, 2026', amount: '₱ 10,000.00', status: 'Approved', notes: 'Mutual aid claim processed.' }
  ];

  const loadRequests = async () => {
    try {
      const res = await fetchFacultyRequests().catch(() => null);
      const apiRequests = res?.data || [];
      const localRequests = JSON.parse(localStorage.getItem('ucare_benefit_requests') || '[]');

      const normalizedLocal = localRequests.map(item => ({
        id: item.id,
        type: item.type || item.benefitType || 'Assistance Request',
        date: item.date || item.dateFiled || 'Recent',
        amount: item.amount || item.amountRequested || '₱ 0.00',
        status: item.status || 'Pending',
        notes: item.notes || 'Application submitted'
      }));

      const combined = [...normalizedLocal, ...apiRequests];
      if (combined.length > 0) {
        setRequests(combined);
      } else {
        setRequests(defaultRequests);
      }
    } catch (err) {
      const localRequests = JSON.parse(localStorage.getItem('ucare_benefit_requests') || '[]');
      const normalizedLocal = localRequests.map(item => ({
        id: item.id,
        type: item.type || item.benefitType || 'Assistance Request',
        date: item.date || item.dateFiled || 'Recent',
        amount: item.amount || item.amountRequested || '₱ 0.00',
        status: item.status || 'Pending',
        notes: item.notes || 'Application submitted'
      }));
      setRequests(normalizedLocal.length > 0 ? normalizedLocal : defaultRequests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    const handleSync = () => {
      loadRequests();
    };

    window.addEventListener('ucare_requests_updated', handleSync);
    return () => window.removeEventListener('ucare_requests_updated', handleSync);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      animatePageEntrance(containerRef.current);
    }
  }, []);

  useEffect(() => {
    if (tableRef.current && !loading) {
      animateTableRows(tableRef.current);
    }
  }, [filter, requests, loading]);

  const filteredRequests = requests.filter(r => {
    if (filter === 'Pending') return r.status === 'Pending' || r.status === 'To verify' || r.status === 'Needs Review';
    if (filter === 'Released') return r.status === 'Approved' || r.status === 'Released' || r.status === 'Completed';
    return true;
  });

  return (
    <main className="main-content" ref={containerRef}>
      {/* Header Row - Fixed single-line heading */}
      <div className="dashboard-header" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div className="dashboard-header-text" style={{ flexShrink: 0 }}>
          <h1 style={{ whiteSpace: 'nowrap', margin: 0, fontSize: '1.65rem' }}>My assistance requests</h1>
          <p style={{ margin: '4px 0 0 0', whiteSpace: 'nowrap' }}>Track status and updates on your submitted benefit applications</p>
        </div>

        {/* Filter Tabs (Top Right on Laptop) */}
        <div className="filter-tabs" style={{ flexShrink: 0 }}>
          <button className={`filter-tab ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>
            All ({requests.length})
          </button>
          <button className={`filter-tab ${filter === 'Pending' ? 'active' : ''}`} onClick={() => setFilter('Pending')}>
            Pending ({requests.filter(r => r.status === 'Pending' || r.status === 'To verify' || r.status === 'Needs Review').length})
          </button>
          <button className={`filter-tab ${filter === 'Released' ? 'active' : ''}`} onClick={() => setFilter('Released')}>
            Approved/Released ({requests.filter(r => r.status === 'Approved' || r.status === 'Released' || r.status === 'Completed').length})
          </button>
        </div>
      </div>

      {/* Requests List Cards & Table */}
      <div className="recent-activity-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Swipeable Responsive Table Container */}
        <div className="table-responsive" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch', border: 'none' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ⏳ Loading assistance requests...
            </div>
          ) : (
            <table className="data-table" ref={tableRef} style={{ width: '100%', minWidth: '640px' }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Assistance Type</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Date Filed</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Amount Requested</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Application Notes / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text-main)' }}>{r.type}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><strong className="amount-text">{r.amount}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`status-tag ${r.status === 'Pending' || r.status === 'To verify' || r.status === 'Needs Review' ? 'pending' : r.status === 'Approved' || r.status === 'Released' || r.status === 'Completed' ? 'approved' : 'declined'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.notes}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No requests found under "{filter}".
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
