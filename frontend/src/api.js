// API base URL — relative path works in both dev (Vite proxy) and production
const API_BASE = '/api';

/**
 * Get stored auth token from localStorage
 */
export function getToken() {
  return localStorage.getItem('ucare_token');
}

/**
 * Store auth token and user info
 */
export function setAuth(token, user) {
  localStorage.setItem('ucare_token', token);
  localStorage.setItem('ucare_user', JSON.stringify(user));
}

/**
 * Clear auth data (logout)
 */
export function clearAuth() {
  localStorage.removeItem('ucare_token');
  localStorage.removeItem('ucare_user');
}

/**
 * Get stored user object
 */
export function getUser() {
  const raw = localStorage.getItem('ucare_user');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Resolve profile photo URL cleanly to avoid port mismatch, double /storage prefixes,
 * or direct hits to Apache port 80 when in development.
 */
export function resolvePhotoUrl(photo) {
  if (!photo) return null;
  if (typeof photo !== 'string') return null;
  if (photo.startsWith('blob:') || photo.startsWith('data:')) return photo;

  // Match full localhost / 127.0.0.1 URLs (with or without port) pointing to /storage/
  const localhostStorageMatch = photo.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/storage\/(.+)$/i);
  if (localhostStorageMatch) {
    return `/storage/${localhostStorageMatch[1]}`;
  }

  // Any other remote HTTP/HTTPS URL
  if (photo.startsWith('http://') || photo.startsWith('https://')) {
    return photo;
  }

  // Strip leading /storage/ or storage/ and leading slashes
  const cleanPath = photo.replace(/^\/?storage\//i, '').replace(/^\/+/, '');
  return `/storage/${cleanPath}`;
}

/**
 * Fetch fresh authenticated user profile from backend
 */
export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await apiFetch('/auth/me');
    if (res?.data) {
      setAuth(token, res.data);
      return res.data;
    }
  } catch {
    // Silently return null on error
  }
  return null;
}

/**
 * Make an authenticated API request
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw { status: response.status, data };
  }

  return data;
}

/**
 * POST /api/auth/login
 */
export async function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * POST /api/auth/logout
 */
export async function logout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

/**
 * GET /api/dashboard
 * Returns all stats for the admin home page with optional year filtering.
 */
export function fetchDashboard(params = {}) {
  const query = new URLSearchParams();
  if (params.year !== undefined && params.year !== null) {
    query.append('year', params.year);
  }
  const qs = query.toString();
  return apiFetch(`/dashboard${qs ? `?${qs}` : ''}`);
}

export function fetchFacultyDashboard() {
  return apiFetch('/faculty/dashboard');
}

export function fetchFacultyPayments() {
  return apiFetch('/faculty/payments');
}

export function fetchFacultyRequests() {
  return apiFetch('/faculty/requests');
}

export function fetchFacultyMembers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.department && params.department !== 'All') query.append('department', params.department);
  const qStr = query.toString();
  return apiFetch(`/faculty-members${qStr ? `?${qStr}` : ''}`);
}

export function createFacultyMember(data) {
  if (data instanceof FormData) {
    const token = getToken();
    return fetch('/api/faculty-members', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    }).then(async res => {
      const json = await res.json().catch(() => null);
      if (!res.ok) throw { status: res.status, data: json };
      return json;
    });
  }
  return apiFetch('/faculty-members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFacultyMember(id, data) {
  if (data instanceof FormData) {
    const token = getToken();
    data.append('_method', 'PUT');
    return fetch(`/api/faculty-members/${id}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data,
    }).then(async res => {
      const json = await res.json().catch(() => null);
      if (!res.ok) throw { status: res.status, data: json };
      return json;
    });
  }
  return apiFetch(`/faculty-members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFacultyMember(id) {
  return apiFetch(`/faculty-members/${id}`, {
    method: 'DELETE',
  });
}

export function fetchReports(fromDate, toDate, reportType) {
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  if (reportType) params.append('report_type', reportType);
  return apiFetch(`/reports?${params.toString()}`);
}

/**
 * POST /api/notify
 * Sends a real-time notification. Faculty → all admins. Admin → specific user.
 * @param {{ type, title, message, action_tab, user_id? }} payload
 */
export function sendNotify(payload) {
  return apiFetch('/notify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

export function fetchAnnouncements() {
  return apiFetch('/announcements');
}

export function fetchContributionDrives() {
  return apiFetch('/announcements/contribution-drives');
}

export function createAnnouncement(data) {
  return apiFetch('/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAnnouncement(id, data) {
  return apiFetch(`/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteAnnouncement(id) {
  return apiFetch(`/announcements/${id}`, {
    method: 'DELETE',
  });
}

// ── BENEFIT REQUESTS ─────────────────────────────────────────────────────────

export function fetchBenefitRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.faculty_id) query.append('faculty_id', params.faculty_id);
  const qStr = query.toString();
  return apiFetch(`/benefit-requests${qStr ? `?${qStr}` : ''}`);
}

export async function submitBenefitRequest(formDataOrData) {
  const token = getToken();
  const isFormData = formDataOrData instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch('/api/benefit-requests', {
    method: 'POST',
    headers,
    body: isFormData ? formDataOrData : JSON.stringify(formDataOrData),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw { status: response.status, data };
  }
  return data;
}

export function decideBenefitRequest(id, status) {
  return apiFetch(`/benefit-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── BENEFIT TYPES ────────────────────────────────────────────────────────────

export function fetchBenefitTypes(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') query.append('status', params.status);
  const qStr = query.toString();
  return apiFetch(`/benefit-types${qStr ? `?${qStr}` : ''}`);
}

export function createBenefitType(data) {
  return apiFetch('/benefit-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBenefitType(id, data) {
  return apiFetch(`/benefit-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteBenefitType(id) {
  return apiFetch(`/benefit-types/${id}`, {
    method: 'DELETE',
  });
}

// ── MISC ──────────────────────────────────────────────────────────────────────

// ── Notification API helpers ──────────────────────────────────

/**
 * GET /api/notifications
 * Returns { data: [...], unread_count: N }
 */
export function fetchNotifications() {
  return apiFetch('/notifications');
}

/**
 * PATCH /api/notifications/{id}/read
 */
export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

/**
 * PATCH /api/notifications/read-all
 */
export function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}

/**
 * DELETE /api/notifications/{id}
 */
export function deleteNotification(id) {
  return apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}
