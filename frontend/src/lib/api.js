const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Get stored auth token
 */
function getToken() {
  return localStorage.getItem('accessToken');
}

/**
 * Make an authenticated API request
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token expiry
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED') {
      // Try to refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the original request
        headers.Authorization = `Bearer ${getToken()}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (!retryResponse.ok) {
          throw new Error(`API error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
    }
    throw new Error(data.error || 'Authentication required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

async function refreshToken() {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ─── API Methods ──────────────────────────────────────────

export const api = {
  // Auth
  login: (zenithId, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ zenithId, password }) }),
  
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request('/auth/me'),

  // Companies
  getCompanies: () => request('/companies'),
  getCompany: (id) => request(`/companies/${id}`),

  // Submissions
  getSubmissions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/submissions${qs ? `?${qs}` : ''}`);
  },
  searchSubmissions: (q, params = {}) => {
    const qs = new URLSearchParams({ q, ...params }).toString();
    return request(`/submissions/search?${qs}`);
  },
  getSubmission: (id) => request(`/submissions/${id}`),
  createSubmission: (data) =>
    request('/submissions', { method: 'POST', body: JSON.stringify(data) }),
  toggleUpvote: (id) => request(`/submissions/${id}/upvote`, { method: 'POST' }),
  toggleBookmark: (id) => request(`/submissions/${id}/bookmark`, { method: 'POST' }),
  getMySubmissions: () => request('/submissions/mine'),
  deleteSubmission: (id) => request(`/submissions/${id}`, { method: 'DELETE' }),

  // Comments
  createComment: (submissionId, text) =>
    request('/comments', { method: 'POST', body: JSON.stringify({ submissionId, text }) }),

  // Analytics — Public
  getTopicHeatmap: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-heatmap${qs ? `?${qs}` : ''}`);
  },
  getTopicFrequency: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-frequency${qs ? `?${qs}` : ''}`);
  },
  getTopicTrends: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-trends${qs ? `?${qs}` : ''}`);
  },
  getCompanyTimeline: () => request('/analytics/company-timeline'),
  getDifficultyDistribution: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/difficulty-distribution${qs ? `?${qs}` : ''}`);
  },
  getTopQuestions: (limit = 15) => request(`/analytics/top-questions?limit=${limit}`),

  // Analytics — Moderator only
  getSearchGaps: () => request('/analytics/search-gaps'),
  getSubmissionPipeline: () => request('/analytics/submission-pipeline'),
  getContributorLeaderboard: () => request('/analytics/contributor-leaderboard'),
  getWeeklyActiveUsers: () => request('/analytics/weekly-active-users'),
};

export default api;
