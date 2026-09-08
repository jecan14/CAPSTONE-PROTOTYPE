import React, { useState, useEffect, useRef } from 'react';
import { animatePageEntrance, animateModalOpen, animateModalClose } from '../utils/animations';
import { resolvePhotoUrl } from '../api';

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
    return resolvePhotoUrl(user.profile_photo_url || user.profile_photo);
  };
  const [photoPreview, setPhotoPreview] = useState(resolveInitialPhoto);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    setPhotoPreview(resolvePhotoUrl(currentUser?.profile_photo_url || currentUser?.profile_photo));
  }, [currentUser?.profile_photo, currentUser?.profile_photo_url]);

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

  const uploadPhotoFile = async (fileToUpload) => {
    const file = fileToUpload || photoFile;
    if (!file) return false;
    setPhotoUploading(true);
    setProfileFeedback('Uploading profile photo...');
    try {
      const token = localStorage.getItem('ucare_token');
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/auth/upload-photo', {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Accept': 'application/json' },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setProfileFeedback('Error: ' + (data?.message || 'Photo upload failed.'));
        return false;
      }

      const freshUrl = resolvePhotoUrl(data.profile_photo_url || data.photo_url || data.profile_photo);
      setPhotoPreview(freshUrl);

      // Persist new photo URL in localStorage and notify listeners
      const stored = localStorage.getItem('ucare_user');
      let updatedUser = null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          updatedUser = {
            ...parsed,
            profile_photo: data.profile_photo,
            profile_photo_url: freshUrl
          };
          localStorage.setItem('ucare_user', JSON.stringify(updatedUser));
        } catch {}
      } else {
        updatedUser = {
          ...(data.user || user),
          profile_photo: data.profile_photo,
          profile_photo_url: freshUrl
        };
        localStorage.setItem('ucare_user', JSON.stringify(updatedUser));
      }

      if (updatedUser) {
        window.dispatchEvent(new CustomEvent('ucare_user_updated', { detail: updatedUser }));
      }
      setPhotoFile(null);
      setProfileFeedback('Success: Profile photo updated!');
      return true;
    } catch {
      setProfileFeedback('Error: Could not upload photo. Please try again.');
      return false;
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));

    // Auto-upload immediately on select so the user doesn't have to guess
    await uploadPhotoFile(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback('');
    try {
      // If photo file is selected and not yet uploaded, upload it first
      if (photoFile) {
        const photoOk = await uploadPhotoFile(photoFile);
        if (!photoOk) {
          setProfileSaving(false);
          return;
        }
      }

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
      let mergedUser = data.data;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          mergedUser = { ...parsed, ...data.data };
          localStorage.setItem('ucare_user', JSON.stringify(mergedUser));
        } catch {}
      }

      if (mergedUser) {
        window.dispatchEvent(new CustomEvent('ucare_user_updated', { detail: mergedUser }));
      }

      setProfileFeedback('Success: Profile updated successfully!');
      setTimeout(() => {
        setProfileFeedback('');
        handleCloseModal();
      }, 900);

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
          onClick={() => setActiveModal('editProfile')}
          title="Click to update your profile and photo"
        >
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={() => setPhotoPreview(null)}
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
              <div className="setting-card-subtitle">Benefit claims &amp; union announcements</div>
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
                  border: '3px solid var(--primary-maroon)',
                  position: 'relative'
                }}>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setPhotoPreview(null)}
                    />
                  ) : (
                    (user.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  )}
                  {photoUploading && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', color: '#fff'
                    }}>
                      ⌛
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Profile Photo
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      disabled={photoUploading}
                    >
                      {photoUploading ? 'Uploading...' : 'Choose Photo'}
                    </button>
                    {photoFile && !photoUploading && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                        onClick={() => uploadPhotoFile(photoFile)}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    JPG, PNG or WebP · Max 5MB
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
          <div className="modal-content" ref={modalRef} style={{ maxWidth: '740px' }}>
            <div className="modal-header">
              <h3>ISPSC Faculty Union Laws &amp; Policies</h3>
              <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-body-form" style={{ maxHeight: '520px', overflowY: 'auto', gap: '18px', fontSize: '0.875rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #8B1E3F 0%, #6E1731 100%)', color: '#FFF', padding: '18px 20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(139, 30, 63, 0.2)' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#F4B942', fontWeight: '800', letterSpacing: '0.02em' }}>
                  Ilocos Sur Polytechnic State College Federated Faculty Union (IFFU)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#FCE8B3' }}>
                  Constitution and By-Laws • Preamble &amp; Articles I to V
                </p>
              </div>

              {/* Preamble */}
              <div style={{
                background: '#FAF5F6',
                border: '1px solid #F1D4DC',
                borderLeft: '4px solid var(--primary-maroon)',
                padding: '14px 16px',
                borderRadius: '0 8px 8px 0'
              }}>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--primary-maroon)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Preamble
                </div>
                <p style={{ color: 'var(--text-main)', lineHeight: '1.65', margin: 0, fontStyle: 'italic', fontSize: '0.88rem' }}>
                  We, the faculty members of the Ilocos Sur Polytechnic State College, in order to ensure oneness and unity, protect and uphold our individual and collective rights, promote effective and efficient performance of our duties with the highest degree of responsibility, integrity and loyalty as well as to foster harmonious and progressive faculty- administrator relations do herby promulgate this Constitution and By- laws.
                </p>
              </div>

              {/* Article I */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>
                  Article I – NAME AND DOMICILE
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Section 1.</strong> This organization shall be known as the Ilocos Sur Polytechnic State College Federated Faculty Union (IFFU) hereinafter referred to as the UNION.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 2.</strong> The domicile of the union shall be at the ISPSC, Main Campus, Sta Maria, Ilocos Sur.
                  </p>
                </div>
              </div>

              {/* Article II */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>
                  Article II – DECLARATION OF OBJECTIVES
                </h4>
                <p style={{ color: 'var(--text-main)', margin: '0 0 8px 0', fontWeight: '600' }}>
                  The Union commits itself to the pursuit of the following objectives:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Section 1.</strong> To establish an organization that will represent the ISPSC Faculty in the Board of Trustees, council, committee, or body and in any collective negotiation with the administration.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 2.</strong> To promote the general welfare of the faculty members of ISPSC.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 3.</strong> To protect and uphold the individual and collective rights of faculty members of ISPSC.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 4.</strong> To promote efficient and effective performance of faculty duties with the highest degree of responsibility, integrity and loyalty thereby elevating their calling to the highest level of competence, respect and dedication to public service.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 5.</strong> To foster harmonious and progressive faculty- administrator relations.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 6.</strong> To help administration in the formulation and implementation of school (college/university) policies, rules and regulations.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 7.</strong> To -inculcate among faculty members love of the College /university imbued with the spirit of loyalty and dedication.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 8.</strong> To promote closer and stronger relationship, and genuine brotherhood among the faculty, staff, students, and administrators to enhance better service to the community and to attain ultimate peace, unity, and progress among people.
                  </p>
                </div>
              </div>

              {/* Article III */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>
                  Article III – MEMBERSHIP
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Section 1.</strong> All ISPSC faculty members who hold an academic rank not otherwise disqualified under any of the succeeding provisions and without regard to status of appointment, sex, race, nationality, religion or political belief or affiliations is a member of the Union. Except faculty members under contract of service.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 3.</strong> Any member of the Union who hold managerial/ administrative position higher than program head like vice presidents, directors, deans and principals of lateral or vertical promotion or by special appointive designation or any equivalent positions shall not be eligible to hold any elective or appointive position in the Union. Including program head of campuses without deans.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Section 4.</strong> In the event that an officer is appointed or designated and assumed any position stated under Section 3 the said position shall then be considered vacant <em>*transfer section 3 and 4 to Article VI</em>
                  </p>
                  <div>
                    <strong>Section 5.</strong> A faculty loses his membership on the following grounds:
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li><strong>a.</strong> dismissal from the service, resignation from the college or transfer to another government agency;</li>
                      <li><strong>b.</strong> retirement from government service;</li>
                      <li><strong>c.</strong> voluntary withdrawal from the union; and</li>
                      <li><strong>d.</strong> Death.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Article IV */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                <h4 style={{ color: 'var(--primary-maroon)', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>
                  Article IV – RIGHTS AND BENEFITS OF MEMBERS
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                  <div>
                    <strong>Section 1.</strong> A member in good standing shall have the following rights and benefits:
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li><strong>a.</strong> To exercise the right to vote on all matters relating to the affairs of the Union subject to the provisions of section 53. hereof;</li>
                      <li><strong>b.</strong> To be eligible to run to any elective or appointed to office in the Union subject to the provisions of Article X section 13 hereof;</li>
                      <li><strong>c.</strong> To participate in all deliberations/ meetings of the Union;</li>
                      <li><strong>d.</strong> To avail of all the facilities and services of the Union;</li>
                      <li><strong>e.</strong> To examine the records and books of the Union during business hours; and</li>
                      <li><strong>f.</strong> To receive benefits obtained through the CNA subject to DBM rules and regulations.</li>
                    </ul>
                  </div>
                  <p style={{ margin: '4px 0 0 0' }}>
                    <strong>Section 2.</strong> A member certified by the Union President who is not of good standing shall not be entitled from the benefits stated from letter a to e of Section 1.
                  </p>
                </div>
              </div>

              {/* Article V */}
              <div>
                <h4 style={{ color: 'var(--primary-maroon)', margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800' }}>
                  Article V – DUTIES AND RESPONSIBILITIES OF MEMBERS
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-main)', lineHeight: '1.55' }}>
                  <div>
                    <strong>Section 1.</strong> A member shall have the following duties and responsibilities:
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li><strong>a.</strong> To obey and comply with the Constitution and By - laws, and other rules and regulations that may be promulgated by the Union;</li>
                      <li><strong>b.</strong> To attend Union meetings and activities that may be called upon by the officers; and</li>
                      <li><strong>c.</strong> Any member who was not able to attend meetings and activities of the Union without justifiable reason, shall pay a fee amounting to one thousand pesos (1000.00) for officers and 500 hundred pesos (500.00) to the Union treasurer.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '14px' }}>
                <button className="btn-primary" onClick={handleCloseModal}>Close</button>
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
