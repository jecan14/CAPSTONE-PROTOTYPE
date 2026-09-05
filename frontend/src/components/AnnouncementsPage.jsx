import React, { useState, useEffect, useRef } from 'react';
import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../api';
import { animatePageEntrance, animateTableRows, animateModalOpen, animateModalClose } from '../utils/animations';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isContributionDrive, setIsContributionDrive] = useState(false);
  const [benefitType, setBenefitType] = useState('Death Aid / Mortuary');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [saving, setSaving] = useState(false);

  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  const defaultAnnouncements = [
    {
      id: 1,
      title: 'Death Aid Contribution Drive — Late Prof. Dela Cruz',
      category: 'Contribution Drive',
      priority: 'high',
      target_date: '2026-09-15',
      content: 'Special voluntary contribution drive for mortuary benefit assistance to the bereaved family of Prof. Dela Cruz.',
      is_contribution_drive: 1,
      benefit_type: 'Death Aid / Mortuary',
      beneficiary_name: 'Prof. Dela Cruz Family',
      created_at: '2026-08-31T08:00:00.000000Z'
    },
    {
      id: 2,
      title: 'General Assembly Meeting Notice',
      category: 'General Bulletin',
      priority: 'medium',
      target_date: '2026-09-10',
      content: 'All union members are invited to attend the Q3 Federated Union General Assembly meeting at the ISPSC Tagudin Audio-Visual Hall.',
      is_contribution_drive: 0,
      benefit_type: null,
      beneficiary_name: null,
      created_at: '2026-08-28T10:00:00.000000Z'
    }
  ];

  const loadAnnouncements = async () => {
    try {
      const res = await fetchAnnouncements();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setAnnouncements(res.data);
      } else {
        setAnnouncements(defaultAnnouncements);
      }
      setError(null);
    } catch (err) {
      setAnnouncements(defaultAnnouncements);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (containerRef.current) animatePageEntrance(containerRef.current);
  }, []);

  useEffect(() => {
    if (tableRef.current) animateTableRows(tableRef.current);
  }, [announcements]);

  useEffect(() => {
    if (showModal && modalRef.current) {
      animateModalOpen(modalRef.current, overlayRef.current);
    }
  }, [showModal]);

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingId(announcement.id);
      setTitle(announcement.title);
      setContent(announcement.content);
      setIsContributionDrive(Boolean(announcement.is_contribution_drive));
      setBenefitType(announcement.benefit_type || 'Death Aid / Mortuary');
      setBeneficiaryName(announcement.beneficiary_name || '');
    } else {
      setEditingId(null);
      setTitle('');
      setContent('');
      setIsContributionDrive(false);
      setBenefitType('Death Aid / Mortuary');
      setBeneficiaryName('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (modalRef.current) {
      animateModalClose(modalRef.current, overlayRef.current, () => {
        setShowModal(false);
      });
    } else {
      setShowModal(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    
    const payload = {
      title,
      content,
      is_contribution_drive: isContributionDrive,
      benefit_type: isContributionDrive ? benefitType : null,
      beneficiary_name: isContributionDrive ? beneficiaryName : null,
    };

    try {
      if (editingId) {
        await updateAnnouncement(editingId, payload);
      } else {
        await createAnnouncement(payload);
      }
      await loadAnnouncements();
      handleCloseModal();
    } catch (err) {
      alert('Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  return (
    <div className="main-content" ref={containerRef}>
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>Announcements</h1>
          <p>Broadcast updates and news or announce beneficiary aid contribution drives</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal(null)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Announcement
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="recent-activity-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              ⏳ Loading announcements…
            </div>
          ) : (
            <table className="data-table" ref={tableRef}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Title</th>
                  <th style={{ width: '18%' }}>Category / Drive</th>
                  <th style={{ width: '26%' }}>Content Preview</th>
                  <th style={{ width: '14%' }}>Date Posted</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length > 0 ? (
                  announcements.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.title}</div>
                      </td>
                      <td>
                        {item.is_contribution_drive ? (
                          <div>
                            <span className="status-tag approved" style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🤝 {item.benefit_type || 'Aid Drive'}
                            </span>
                            {item.beneficiary_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                                For: {item.beneficiary_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📢 General News</span>
                        )}
                      </td>
                      <td>
                        <div style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          maxWidth: '300px',
                          color: 'var(--text-muted)',
                          fontSize: '0.875rem'
                        }}>
                          {item.content}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn-sm btn-outline" onClick={() => handleOpenModal(item)}>Edit</button>
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No announcements posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Announcement' : 'Create Announcement'}</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-body-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Call for Assistance: Joderick Tejada"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Contribution Drive Toggle Box */}
              <div style={{ 
                background: isContributionDrive ? 'rgba(139, 30, 63, 0.04)' : '#F8FAFC', 
                border: isContributionDrive ? '1px solid var(--primary-maroon)' : '1px solid #E2E8F0',
                borderRadius: '8px', 
                padding: '14px', 
                marginBottom: '16px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="contribDriveCheck"
                    checked={isContributionDrive}
                    onChange={(e) => setIsContributionDrive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="contribDriveCheck" style={{ margin: 0, cursor: 'pointer', fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    🤝 This announcement is a Call for Contributions / Beneficiary Aid
                  </label>
                </div>

                {isContributionDrive && (
                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Beneficiary Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Joderick Tejada"
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        required={isContributionDrive}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Benefit / Aid Type</label>
                      <select
                        className="form-select"
                        value={benefitType}
                        onChange={(e) => setBenefitType(e.target.value)}
                      >
                        <option value="Death Aid / Mortuary">Death Aid / Mortuary</option>
                        <option value="Medical Assistance">Medical Assistance</option>
                        <option value="Retirement">Retirement</option>
                        <option value="Surgical Assistance">Surgical Assistance</option>
                        <option value="Pabaon">Pabaon</option>
                        <option value="Seed Money">Seed Money</option>
                        <option value="Annual Dues">Annual Dues</option>
                        <option value="Calamity Relief">Calamity Relief</option>
                        <option value="Special Assessment">Special Assessment</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Announcement Details</label>
                <textarea
                  className="form-input"
                  placeholder="Provide instructions, background information, or payment guidelines..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="5"
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
