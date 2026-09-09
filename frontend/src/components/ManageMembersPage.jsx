import React, { useState, useEffect, useRef } from 'react';
import { animatePageEntrance, animateTableRows, animateModalOpen, animateModalClose } from '../utils/animations';
import { fetchFacultyMembers, createFacultyMember, updateFacultyMember, deleteFacultyMember, resolvePhotoUrl } from '../api';

const getPhotoUrl = (member) => {
  if (!member) return null;
  return resolvePhotoUrl(member.profile_photo_url || member.profile_photo);
};

export default function ManageMembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberEmpNo, setNewMemberEmpNo] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState('Active');
  const [newMemberDept, setNewMemberDept] = useState('College of Computing & IT');
  const [newMemberContact, setNewMemberContact] = useState('');
  const [newMemberContribution, setNewMemberContribution] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState(null);
  const [newMemberPhotoPreview, setNewMemberPhotoPreview] = useState(null);
  const [formFeedback, setFormFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Member Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editStatus, setEditStatus] = useState('Active');
  const [editDept, setEditDept] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhoto, setEditPhoto] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [editFeedback, setEditFeedback] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // View Member / Enlarged Photo Modal State
  const [previewMember, setPreviewMember] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const editModalRef = useRef(null);
  const editOverlayRef = useRef(null);
  const previewModalRef = useRef(null);
  const previewOverlayRef = useRef(null);
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // Category Filter items
  const categories = ['All', 'Active', 'Inactive', 'On leave', 'Retired'];

  // Load real members from API
  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFacultyMembers();
      setMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load faculty members:', err);
      setError('Could not load faculty accounts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Filtered members calculation
  const filteredMembers = members.filter(member => {
    const term = searchTerm.toLowerCase();
    const name = (member.name || '').toLowerCase();
    const dept = (member.department || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const empNo = (member.employee_no || '').toLowerCase();

    const matchesSearch = name.includes(term) || dept.includes(term) || email.includes(term) || empNo.includes(term);
    const matchesCategory = selectedCategory === 'All' || (member.status || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (containerRef.current) {
      animatePageEntrance(containerRef.current);
    }
  }, []);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  useEffect(() => {
    if (tableRef.current) {
      animateTableRows(tableRef.current);
    }
  }, [selectedCategory, searchTerm, members]);

  useEffect(() => {
    if (showAddModal && modalRef.current) {
      animateModalOpen(modalRef.current, overlayRef.current);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (showEditModal && editModalRef.current) {
      animateModalOpen(editModalRef.current, editOverlayRef.current);
    }
  }, [showEditModal]);

  useEffect(() => {
    if (showPreviewModal && previewModalRef.current) {
      animateModalOpen(previewModalRef.current, previewOverlayRef.current);
    }
  }, [showPreviewModal]);

  const handleOpenPreview = (member) => {
    setPreviewMember(member);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    if (previewModalRef.current) {
      animateModalClose(previewModalRef.current, previewOverlayRef.current, () => {
        setShowPreviewModal(false);
        setPreviewMember(null);
      });
    } else {
      setShowPreviewModal(false);
      setPreviewMember(null);
    }
  };

  const handleSelectNewPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5 MB.');
      return;
    }
    setNewMemberPhoto(file);
    setNewMemberPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearNewPhoto = () => {
    setNewMemberPhoto(null);
    if (newMemberPhotoPreview) URL.revokeObjectURL(newMemberPhotoPreview);
    setNewMemberPhotoPreview(null);
    if (addFileInputRef.current) addFileInputRef.current.value = '';
  };

  const handleSelectEditPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5 MB.');
      return;
    }
    setEditPhoto(file);
    setEditPhotoPreview(URL.createObjectURL(file));
    setEditRemovePhoto(false);
  };

  const handleRemoveEditPhoto = () => {
    setEditPhoto(null);
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
    setEditPhotoPreview(null);
    setEditRemovePhoto(true);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleCloseAddModal = () => {
    if (modalRef.current) {
      animateModalClose(modalRef.current, overlayRef.current, () => {
        setShowAddModal(false);
        setFormFeedback('');
        handleClearNewPhoto();
      });
    } else {
      setShowAddModal(false);
      setFormFeedback('');
      handleClearNewPhoto();
    }
  };

  const handleCloseEditModal = () => {
    if (editModalRef.current) {
      animateModalClose(editModalRef.current, editOverlayRef.current, () => {
        setShowEditModal(false);
        setEditingMember(null);
        setEditFeedback('');
        setEditPhoto(null);
        if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
        setEditPhotoPreview(null);
        setEditRemovePhoto(false);
      });
    } else {
      setShowEditModal(false);
      setEditingMember(null);
      setEditFeedback('');
      setEditPhoto(null);
      if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
      setEditPhotoPreview(null);
      setEditRemovePhoto(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditStatus(member.status || 'Active');
    setEditDept(member.department || '');
    setEditContact(member.contact_no || '');
    setEditPhoto(null);
    setEditPhotoPreview(null);
    setEditRemovePhoto(false);
    setEditFeedback('');
    setShowEditModal(true);
  };

  // Submit Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      setFormFeedback('Error: Full name and email address are required.');
      return;
    }

    setIsSaving(true);
    setFormFeedback('');

    try {
      const formData = new FormData();
      formData.append('name', newMemberName.trim());
      formData.append('email', newMemberEmail.trim());
      formData.append('password', newMemberPassword.trim() || 'password123');
      if (newMemberEmpNo.trim()) formData.append('employee_no', newMemberEmpNo.trim());
      formData.append('department', newMemberDept.trim() || 'General');
      formData.append('status', newMemberStatus);
      if (newMemberContact.trim()) formData.append('contact_no', newMemberContact.trim());
      if (newMemberContribution) formData.append('initial_contribution', parseFloat(newMemberContribution));
      if (newMemberPhoto) formData.append('profile_photo', newMemberPhoto);

      await createFacultyMember(formData);

      setFormFeedback('Success: Faculty member account registered successfully!');
      
      // Reload member directory
      await loadMembers();

      setTimeout(() => {
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPassword('');
        setNewMemberEmpNo('');
        setNewMemberContact('');
        setNewMemberContribution('');
        handleCloseAddModal();
      }, 1000);
    } catch (err) {
      const msg = err?.data?.message || err?.data?.errors?.email?.[0] || 'Failed to create faculty account.';
      setFormFeedback(`Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Edit Member
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    setIsUpdating(true);
    setEditFeedback('');

    try {
      const formData = new FormData();
      formData.append('department', editDept.trim() || 'General');
      formData.append('status', editStatus);
      if (editContact.trim()) formData.append('contact_no', editContact.trim());
      
      if (editPhoto) {
        formData.append('profile_photo', editPhoto);
      } else if (editRemovePhoto) {
        formData.append('profile_photo', 'remove');
      }

      await updateFacultyMember(editingMember.id, formData);

      setEditFeedback('Success: Faculty member details updated!');
      await loadMembers();

      setTimeout(() => {
        handleCloseEditModal();
      }, 900);
    } catch (err) {
      const msg = err?.data?.message || 'Failed to update member.';
      setEditFeedback(`Error: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Deactivate / Reactivate Member (preserves records without disappearing)
  const handleToggleDeactivate = async (member) => {
    const isInactive = (member.status || '').toLowerCase() === 'inactive';
    const actionWord = isInactive ? 'activate' : 'deactivate';
    const newStatus = isInactive ? 'Active' : 'Inactive';

    if (!window.confirm(`Are you sure you want to ${actionWord} ${member.name}? This will mark their account as ${newStatus} without removing their historical records.`)) {
      return;
    }

    try {
      await updateFacultyMember(member.id, { status: newStatus });
      await loadMembers();
    } catch (err) {
      alert(err?.data?.message || `Failed to ${actionWord} member.`);
    }
  };

  // Helper for initials
  const getInitials = (name) => {
    return (name || 'Faculty')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="main-content" ref={containerRef}>
      {/* Page Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1>Manage members</h1>
          <p>ISPSC Tagudin Federated Faculty Union Member Directory &amp; Running Totals</p>
        </div>

        {/* Clean Top-Right Action Button */}
        <button 
          className="btn-primary"
          onClick={() => {
            setFormFeedback('');
            setShowAddModal(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Member
        </button>
      </div>

      {/* Controls Row */}
      <div className="controls-row">
        {/* Search Field */}
        <div className="search-field-container">
          <svg className="search-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, department, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories Dropdown Filter Button */}
        <div className="category-dropdown-container" ref={categoryDropdownRef}>
          <button 
            className="btn-categories"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Category: {selectedCategory}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {showCategoryDropdown && (
            <div className="dropdown-menu">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`dropdown-item ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          color: '#B91C1C',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.88rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button className="btn-sm btn-outline" onClick={loadMembers}>Retry</button>
        </div>
      )}

      {/* Members Table */}
      <div className="recent-activity-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Total Verified Contribution</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading faculty directory...
                  </td>
                </tr>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  let statusClass = 'active';
                  const s = (member.status || '').toLowerCase();
                  if (s === 'on leave') statusClass = 'leave';
                  if (s === 'retired') statusClass = 'retired';
                  if (s === 'inactive' || s === 'deactivated') statusClass = 'inactive';
                  const isInactive = s === 'inactive' || s === 'deactivated';

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="member-cell">
                          <div 
                            className="member-avatar"
                            onClick={() => handleOpenPreview(member)}
                            title="Click to view full photo and profile"
                            style={{ 
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              padding: 0, 
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                              color: '#fff',
                              fontWeight: '700',
                              flexShrink: 0,
                              cursor: 'pointer',
                              border: '2px solid #F4B942',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              transition: 'transform 0.15s ease'
                            }}
                          >
                            {getPhotoUrl(member) ? (
                              <img 
                                src={getPhotoUrl(member)} 
                                alt={member.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              getInitials(member.name)
                            )}
                          </div>
                          <div>
                            <div 
                              style={{ fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' }}
                              onClick={() => handleOpenPreview(member)}
                              title="Click to view profile"
                            >
                              {member.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {member.department || 'General'} • {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.8rem', 
                          fontWeight: '700',
                          padding: '3px 8px',
                          background: '#F1F5F9',
                          borderRadius: '4px',
                          color: '#475569'
                        }}>
                          {member.employee_no || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-tag ${statusClass}`}>
                          {member.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <span className="amount-text">
                          ₱ {Number(member.total_contributions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => handleOpenPreview(member)}
                            title="View Faculty Member & Photo"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            View
                          </button>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => handleOpenEdit(member)}
                            title="Edit Member Details"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => handleToggleDeactivate(member)}
                            title={isInactive ? "Reactivate Faculty Account" : "Deactivate Faculty Account"}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.75rem', 
                              color: isInactive ? '#16A34A' : '#DC2626', 
                              borderColor: isInactive ? '#86EFAC' : '#FCA5A5',
                              backgroundColor: isInactive ? '#F0FDF4' : '#FEF2F2'
                            }}
                          >
                            {isInactive ? 'Activate' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {searchTerm ? `No faculty accounts found matching "${searchTerm}".` : 'No registered faculty accounts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Modal: Add Real Faculty Account */}
      {showAddModal && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>Register Real Faculty Member</h3>
              <button 
                className="btn-close-modal"
                onClick={handleCloseAddModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="modal-body-form">
              {formFeedback && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  backgroundColor: formFeedback.startsWith('Error') ? '#FEE2E2' : '#E8F6EF',
                  color: formFeedback.startsWith('Error') ? '#B91C1C' : '#2E8B57',
                  border: `1px solid ${formFeedback.startsWith('Error') ? '#FCA5A5' : '#C1E6D0'}`
                }}>
                  {formFeedback}
                </div>
              )}

              {/* Profile Photo Upload Field */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 14px',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                marginBottom: '14px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  border: '3px solid #F4B942',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
                }}>
                  {newMemberPhotoPreview ? (
                    <img 
                      src={newMemberPhotoPreview} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    getInitials(newMemberName || 'New Member')
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Profile Picture (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="file"
                      ref={addFileInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleSelectNewPhoto}
                    />
                    <button 
                      type="button" 
                      className="btn-sm btn-outline"
                      onClick={() => addFileInputRef.current?.click()}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      {newMemberPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {newMemberPhotoPreview && (
                      <button 
                        type="button" 
                        className="btn-sm btn-outline"
                        onClick={handleClearNewPhoto}
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    JPG, PNG, or WEBP up to 5MB
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Prof. Juan Luna"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Email Address (Login) *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="e.g. juan@ucare.local"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Initial Password</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Default: password123"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Employee ID No.</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Auto-generated if blank"
                    value={newMemberEmpNo}
                    onChange={(e) => setNewMemberEmpNo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Employment Status</label>
                  <select 
                    className="form-select"
                    value={newMemberStatus}
                    onChange={(e) => setNewMemberStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On leave">On leave</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Contact Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 0917-123-4567"
                    value={newMemberContact}
                    onChange={(e) => setNewMemberContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>College / Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. College of Teacher Education"
                  value={newMemberDept}
                  onChange={(e) => setNewMemberDept(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Initial Verified Contribution (₱, optional)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  placeholder="e.g. 500.00"
                  value={newMemberContribution}
                  onChange={(e) => setNewMemberContribution(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleCloseAddModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Registering...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Modal: Edit Member */}
      {showEditModal && editingMember && (
        <div className="modal-overlay" ref={editOverlayRef}>
          <div className="modal-content" ref={editModalRef} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Edit Faculty Member</h3>
              <button 
                className="btn-close-modal"
                onClick={handleCloseEditModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="modal-body-form">
              {editFeedback && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  backgroundColor: editFeedback.startsWith('Error') ? '#FEE2E2' : '#E8F6EF',
                  color: editFeedback.startsWith('Error') ? '#B91C1C' : '#2E8B57',
                  border: `1px solid ${editFeedback.startsWith('Error') ? '#FCA5A5' : '#C1E6D0'}`
                }}>
                  {editFeedback}
                </div>
              )}

              {/* Profile Photo Section in Edit */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 14px',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  border: '3px solid #F4B942',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
                }}>
                  {editPhotoPreview ? (
                    <img 
                      src={editPhotoPreview} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (!editRemovePhoto && getPhotoUrl(editingMember)) ? (
                    <img 
                      src={getPhotoUrl(editingMember)} 
                      alt={editingMember.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    getInitials(editingMember.name)
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Profile Picture
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="file"
                      ref={editFileInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleSelectEditPhoto}
                    />
                    <button 
                      type="button" 
                      className="btn-sm btn-outline"
                      onClick={() => editFileInputRef.current?.click()}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                        <circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      {editPhotoPreview || (!editRemovePhoto && getPhotoUrl(editingMember)) ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {(editPhotoPreview || (!editRemovePhoto && getPhotoUrl(editingMember))) && (
                      <button 
                        type="button" 
                        className="btn-sm btn-outline"
                        onClick={handleRemoveEditPhoto}
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    {editRemovePhoto ? 'Photo will be removed upon saving' : 'JPG, PNG, or WEBP up to 5MB'}
                  </span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: '800', color: 'var(--primary-maroon)', fontSize: '0.95rem' }}>{editingMember.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {editingMember.email} • ID: {editingMember.employee_no || 'N/A'}
                </div>
              </div>

              <div className="form-group">
                <label>Employment Status</label>
                <select 
                  className="form-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On leave">On leave</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              <div className="form-group">
                <label>College / Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 0917-123-4567"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleCloseEditModal}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Modal: View Member Profile & Photo */}
      {showPreviewModal && previewMember && (
        <div className="modal-overlay" ref={previewOverlayRef}>
          <div className="modal-content" ref={previewModalRef} style={{ maxWidth: '460px', padding: '0', overflow: 'hidden' }}>
            {/* Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #8B1E3F 0%, #581226 100%)',
              padding: '24px 20px 48px',
              position: 'relative',
              textAlign: 'center',
              color: '#fff'
            }}>
              <button 
                className="btn-close-modal"
                onClick={handleClosePreview}
                style={{ position: 'absolute', top: '16px', right: '16px', color: '#fff' }}
              >
                ✕
              </button>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: '800' }}>
                Faculty Member Profile
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                ISPSC Federated Faculty Union
              </p>
            </div>

            {/* Avatar & Info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '-45px',
              padding: '0 24px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1.8rem',
                border: '4px solid #fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                position: 'relative'
              }}>
                {getPhotoUrl(previewMember) ? (
                  <img 
                    src={getPhotoUrl(previewMember)} 
                    alt={previewMember.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  getInitials(previewMember.name)
                )}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '12px', marginBottom: '2px' }}>
                {previewMember.name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {previewMember.email}
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className={`status-tag ${(previewMember.status || '').toLowerCase() === 'on leave' ? 'leave' : (previewMember.status || '').toLowerCase() === 'retired' ? 'retired' : 'active'}`}>
                  {previewMember.status || 'Active'}
                </span>
                <span style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.78rem', 
                  fontWeight: '700',
                  padding: '3px 8px',
                  background: '#F1F5F9',
                  borderRadius: '4px',
                  color: '#475569'
                }}>
                  {previewMember.employee_no || 'No ID'}
                </span>
              </div>

              {/* Details Card */}
              <div style={{
                width: '100%',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                padding: '14px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.85rem',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Department / College:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{previewMember.department || 'General'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Number:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{previewMember.contact_no || 'Not provided'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verified Contributions:</span>
                  <span style={{ fontWeight: '800', color: 'var(--primary-maroon)', fontSize: '0.95rem' }}>
                    ₱ {Number(previewMember.total_contributions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleClosePreview}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => {
                    const mem = previewMember;
                    handleClosePreview();
                    setTimeout(() => {
                      handleOpenEdit(mem);
                    }, 200);
                  }}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Edit Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
