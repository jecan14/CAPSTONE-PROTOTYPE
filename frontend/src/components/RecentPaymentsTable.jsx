import React from 'react';
import { resolvePhotoUrl } from '../api';

const STATUS_CLASS = {
  verified:  'approved',
  completed: 'approved',
  approved:  'approved',
  pending:   'pending',
  'to verify': 'pending',
  rejected:  'rejected',
  declined:  'rejected',
};

function statusClass(status = '') {
  return STATUS_CLASS[status.toLowerCase()] ?? 'pending';
}

export default function RecentPaymentsTable({ payments = [], onNavigate }) {
  return (
    <div className="recent-activity-panel">
      <div className="panel-header">
        <h2>Recent Payment Activity</h2>
        <button
          className="view-all-link"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigate) onNavigate('Manage Payments');
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="table-responsive">
        {payments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No payment records found.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reference #</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="member-cell">
                      <div 
                        className="member-avatar"
                        style={{
                          padding: 0,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                          color: '#fff',
                          fontWeight: '700'
                        }}
                      >
                        {resolvePhotoUrl(item.profile_photo_url || item.profile_photo) ? (
                          <img
                            src={resolvePhotoUrl(item.profile_photo_url || item.profile_photo)}
                            alt={item.member}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          item.avatar
                        )}
                      </div>
                      <span>{item.member}</span>
                    </div>
                  </td>
                  <td>{item.date}</td>
                  <td>{item.type}</td>
                  <td>
                    <span className="ref-code">{item.refNo}</span>
                  </td>
                  <td>
                    <span className="amount-text">{item.amount}</span>
                  </td>
                  <td>
                    <span className={`status-tag ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
