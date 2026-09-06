import React, { useState, useEffect, useRef } from 'react';
import { animatePageEntrance, animateModalOpen, animateModalClose } from '../utils/animations';

export default function FacultyProfile({ currentUser, onLogout }) {
  const user = currentUser || { name: 'Prof. Maria Santos', email: 'faculty@ucare.local' };

  const containerRef = useRef(null);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  // Modal State Controls
  const [activeModal, setActiveModal] = useState(null); // 'employment', 'password', 'notifications', 'policies'

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState('');

  // Notification Settings State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [benefitAlerts, setBenefitAlerts] = useState(true);
  const [bulletinAlerts, setBulletinAlerts] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Edit Profile Form State
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileFirstName, setProfileFirstName] = useState(user.facultyMember?.first_name || '');
  const [profileLastName, setProfileLastName] = useState(user.facultyMember?.last_name || '');
  const [profileDepartment, setProfileDepartment] = useState(user.facultyMember?.department || '');
  const [profileContact, setProfileContact] = useState(user.facultyMember?.contact_no || '');
  const [profileFeedback, setProfileFeedback] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Profile Photo State
  const resolveInitialPhoto = () => {
    if (user.profile_photo_url) return user.profile_photo_url;
    if (user.profile_photo) {
      if (user.profile_photo.startsWith('http://') || user.profile_photo.startsWith('https://')) {
        return user.profile_photo;
      }
      return `/storage/${user.profile_photo.replace(/^\/+/, '')}`;
    }
    return null;
  };
  const [photoPreview, setPhotoPreview] = useState(resolveInitialPhoto);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      animatePageEntrance(containerRef.current);
    }
  }, []);

  useEffect(() => {
    if (activeModal && modalRef.current) {
      animateModalOpen(modalRef.current, overlayRef.current);
    }
  }, [activeModal]);

  const handleCloseModal = () => {
    if (modalRef.current) {
      animateModalClose(modalRef.current, overlayRef.current, () => setActiveModal(null));
    } else {
      setActiveModal(null);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback('Error: New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback('Error: New passwords do not match. Please check again.');
      return;
    }

    try {
      const token = localStorage.getItem('ucare_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Accept':        'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          current_password:          currentPassword,
          new_password:              newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = data?.message || 'Failed to change password.';
        setPasswordFeedback(`Error: ${msg}`);
        return;
      }

      setPasswordFeedback('Success: Password updated successfully!');
      setTimeout(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordFeedback('');
        handleCloseModal();
      }, 1100);

    } catch (err) {
      setPasswordFeedback('Error: Could not connect to the server. Please try again.');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoUploading(true);
    try {
      const token = localStorage.getItem('ucare_token');
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await fetch('/api/auth/upload-photo', {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setProfileFeedback('Error: ' + (data?.message || 'Photo upload failed.'));
        return;
      }

      // Persist new photo URL in localStorage and notify listeners
      const stored = localStorage.getItem('ucare_user');
      let updatedUser = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          updatedUser = {
            ...parsed,
            profile_photo: data.profile_photo,
            profile_photo_url: data.profile_photo_url || data.photo_url || `/storage/${data.profile_photo}`
          };
          localStorage.setItem('ucare_user', JSON.stringify(updatedUser));
        } catch {}
      }
      if (updatedUser) {
        window.dispatchEvent(new CustomEvent('ucare_user_updated', { detail: updatedUser }));
      }
      setPhotoFile(null);
      setProfileFeedback('Success: Profile photo updated!');
    } catch {
      setProfileFeedback('Error: Could not upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback('');
    try {
      const token = localStorage.getItem('ucare_token');
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Accept':        'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name:        profileName,
          email:       profileEmail,
          first_name:  profileFirstName,
          last_name:   profileLastName,
          department:  profileDepartment,
          contact_no:  profileContact,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = data?.message || data?.errors?.email?.[0] || 'Failed to update profile.';
        setProfileFeedback(`Error: ${msg}`);
        return;
      }

      // Update localStorage so the name in the header reflects immediately
      const stored = localStorage.getItem('ucare_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem('ucare_user', JSON.stringify({ ...parsed, ...data.data }));
        } catch {}
      }

      setProfileFeedback('Success: Profile updated successfully!');
      setTimeout(() => {
        setProfileFeedback('');
        handleCloseModal();
        // Reload so the header name refreshes
        window.location.reload();
      }, 1100);

    } catch (err) {
      setProfileFeedback('Error: Could not connect to the server. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => {
      setNotifSaved(false);
      handleCloseModal();
    }, 900);
  };

  return (
    <main className="main-content" ref={containerRef}>
      {/* Profile Header */}
      <div className="faculty-profile-header-card">
        <div
          className="faculty-avatar-large"
          style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
          title="Click Edit Profile to change your photo"
        >
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '1.8rem', fontWeight: '800' }}>
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'FM'}
            </span>
          )}
        </div>
        <div className="faculty-profile-info">
          <div className="faculty-profile-name">{user.name}</div>
          <div className="faculty-profile-role">Faculty Member • ISPSC Tagudin Campus</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Email: {user.email}
          </div>
        </div>
      </div>

      {/* Settings Grid (2-column on Laptop, 1-column on Phone) */}
      <div className="settings-grid">
        {/* 0. Edit Profile Card */}
        <div className="setting-card" onClick={() => setActiveModal('editProfile')}>
          <div className="setting-card-left">
            <div className="setting-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className="setting-card-title">Edit Profile</div>
              <div className="setting-card-subtitle">Update your name, email, department &amp; contact</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>&gt;</span>
        </div>

        {/* 1. Employment Info Setting Card */}
        <div className="setting-card" onClick={() => setActiveModal('employment')}>
          <div className="setting-card-left">
            <div className="setting-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="setting-card-title">Employment Information</div>
              <div className="setting-card-subtitle">College of Teacher Education, Rank &amp; Department</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>&gt;</span>
        </div>

        {/* 2. Change Password Setting Card */}
        <div className="setting-card" onClick={() => setActiveModal('password')}>
          <div className="setting-card-left">
            <div className="setting-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <div className="setting-card-title">Change Password</div>
              <div className="setting-card-subtitle">Update security credentials &amp; password</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>&gt;</span>
        </div>

        {/* 3. Notification Settings Card */}
        <div className="setting-card" onClick={() => setActiveModal('notifications')}>
          <div className="setting-card-left">
            <div className="setting-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <div className="setting-card-title">Notification Settings</div>
              <div className="setting-card-subtitle">Email &amp; SMS alerts for unpaid dues</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>&gt;</span>
        </div>

        {/* 4. Union Laws & Policies Card */}
        <div className="setting-card" onClick={() => setActiveModal('policies')}>
          <div className="setting-card-left">
            <div className="setting-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <div className="setting-card-title">Union Laws &amp; Policies</div>
              <div className="setting-card-subtitle">Read faculty constitution &amp; assistance policies</div>
            </div>
          </div>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>&gt;</span>
        </div>
      </div>

      {/* Log Out Button Card */}
      <div 
        className="setting-card" 
        style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', marginTop: '12px' }}
        onClick={() => setActiveModal('logout')}
      >
        <div className="setting-card-left">
          <div className="setting-icon-box" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div>
            <div className="setting-card-title" style={{ color: '#DC2626' }}>Log Out of U.C.A.R.E.</div>
            <div className="setting-card-subtitle" style={{ color: '#991B1B' }}>Sign out of your faculty account session</div>
          </div>
        </div>
        <span style={{ fontSize: '1.2rem', color: '#DC2626', fontWeight: 'bold' }}>&gt;</span>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 0: Edit Profile
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'editProfile' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleProfileSubmit} className="modal-body-form">
              {profileFeedback && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  backgroundColor: profileFeedback.startsWith('Error') ? '#FEE2E2' : '#E8F6EF',
                  color: profileFeedback.startsWith('Error') ? '#B91C1C' : '#2E8B57',
                  border: `1px solid ${profileFeedback.startsWith('Error') ? '#FCA5A5' : '#C1E6D0'}`
                }}>
                  {profileFeedback}
                </div>
              )}

              {/* Photo Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                {/* Circle avatar preview */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)',
                  overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: '800', color: '#fff',
                  border: '3px solid var(--primary-maroon)'
                }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (user.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Profile Photo
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      ref={photoInputRef}
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Choose Photo
                    </button>
                    {photoFile && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                        onClick={handlePhotoUpload}
                        disabled={photoUploading}
                      >
                        {photoUploading ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    JPG, PNG or WebP · Max 2MB
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary-maroon)', marginBottom: '4px' }}>
                Account Info
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Personal Info */}
              <div style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary-maroon)', marginTop: '8px', marginBottom: '4px' }}>
                Personal Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maria"
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Santos"
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Department / College</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. College of Engineering"
                    value={profileDepartment}
                    onChange={(e) => setProfileDepartment(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Contact Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 09XX-XXX-XXXX"
                    value={profileContact}
                    onChange={(e) => setProfileContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={profileSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 1: Employment Information
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'employment' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>Employment Information</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>
            <div className="modal-body-form" style={{ gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Employee ID</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary-maroon)' }}>EMP-2026-0842</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Membership Status</div>
                  <span className="status-tag active" style={{ marginTop: '2px' }}>Active Member</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>College / Campus</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>College of Teacher Education</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Academic Rank / Position</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>Associate Professor II</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Employment Status</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>Permanent / Tenured</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Date Hired</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>September 15, 2018</div>
                </div>
              </div>

              <div style={{ background: '#FEF8E7', border: '1px solid #FCE8B3', padding: '12px 14px', borderRadius: '6px', fontSize: '0.82rem', color: '#92400E' }}>
                💡 <strong>Total Remitted Dues:</strong> ₱ 28,500.00 (ISPSC Tagudin Faculty Union Records Engine)
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={handleCloseModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 2: Change Password
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'password' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h3>Change Account Password</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="modal-body-form">
              {passwordFeedback && (
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: '6px', 
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  backgroundColor: passwordFeedback.startsWith('Error') ? '#FEE2E2' : '#E8F6EF',
                  color: passwordFeedback.startsWith('Error') ? '#B91C1C' : '#2E8B57',
                  border: `1px solid ${passwordFeedback.startsWith('Error') ? '#FCA5A5' : '#C1E6D0'}`
                }}>
                  {passwordFeedback}
                </div>
              )}

              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Enter new password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save New Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 3: Notification Settings
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'notifications' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h3>Notification Settings</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSaveNotifications} className="modal-body-form" style={{ gap: '16px' }}>
              {notifSaved && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '700', backgroundColor: '#E8F6EF', color: '#2E8B57', border: '1px solid #C1E6D0' }}>
                  ✓ Notification preferences updated successfully!
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>⚠️ Unpaid Dues Email Reminders</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Get email alerts when monthly contribution is due</div>
                  </div>
                  <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-maroon)' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>📱 SMS Verification Alerts</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Receive SMS notification when payment is verified</div>
                  </div>
                  <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-maroon)' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>🏥 Benefit Claim Approval Updates</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Alerts when assistance claims are approved or paid out</div>
                  </div>
                  <input type="checkbox" checked={benefitAlerts} onChange={(e) => setBenefitAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-maroon)' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>📢 Union News &amp; Meeting Bulletins</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Monthly financial statements &amp; general assembly notices</div>
                  </div>
                  <input type="checkbox" checked={bulletinAlerts} onChange={(e) => setBulletinAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary-maroon)' }} />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Preferences</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 4: Union Laws & Policies Reader
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'policies' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '660px' }}>
            <div className="modal-header">
              <h3>ISPSC Faculty Union Laws &amp; Policies</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-body-form" style={{ maxHeight: '440px', overflowY: 'auto', gap: '16px', fontSize: '0.875rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)', color: '#FFF', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#F4B942' }}>ISPSC Tagudin Federated Faculty Union</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#FCE8B3' }}>Compensation &amp; Assistance Records Engine (U.C.A.R.E.) Charter</p>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', marginTop: 0 }}>Article I — Monthly Union Contribution Dues</h4>
                <p style={{ color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>
                  Every regular faculty member of ISPSC Tagudin Campus shall remit a mandatory monthly contribution of <strong>₱500.00</strong> to support the mutual assistance fund, operational expenditures, and emergency aid reserves.
                </p>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', marginTop: 0 }}>Article II — Assistance Fund Benefit Categories</h4>
                <ul style={{ paddingLeft: '20px', margin: '4px 0', lineHeight: '1.6' }}>
                  <li><strong>Medical &amp; Hospitalization Assistance:</strong> Financial grant up to <strong>₱15,000.00</strong> per illness or hospital confinement.</li>
                  <li><strong>Bereavement &amp; Funeral Assistance:</strong> Death benefit grant up to <strong>₱10,000.00</strong> for immediate family members.</li>
                  <li><strong>Educational &amp; Calamity Relief:</strong> Financial assistance up to <strong>₱8,000.00</strong> for natural disaster damage or academic research support.</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--primary-maroon)', marginTop: 0 }}>Article III — Remittance Verification &amp; Auditing</h4>
                <p style={{ color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}>
                  All uploaded proof of payment receipts are audited by the Union Treasurer and Secretary-Administrator. Official verification is issued within 5 working days upon receipt of remittance proof.
                </p>
              </div>

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button className="btn-primary" onClick={handleCloseModal}>I Understand &amp; Agree</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
         MODAL 5: Log Out Confirmation
         ─────────────────────────────────────────────────────────────────── */}
      {activeModal === 'logout' && (
        <div className="modal-overlay" ref={overlayRef}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.25rem' }}>🚪</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Sign Out Confirmation</h3>
              </div>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-body-form" style={{ padding: '24px', gap: '18px', textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  Are you sure you want to sign out?
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  You will be logged out of your ISPSC Tagudin Faculty Union session.
                </p>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'center', gap: '14px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  style={{ minWidth: '120px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={() => {
                    handleCloseModal();
                    if (onLogout) onLogout();
                  }}
                  style={{ 
                    minWidth: '130px',
                    background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)' 
                  }}
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
