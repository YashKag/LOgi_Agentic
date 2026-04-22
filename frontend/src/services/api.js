import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export const reportService = {
  /** Check backend health and configuration */
  getHealth: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/health`);
      return response.data;
    } catch {
      // fallback to root /health for older server version
      const response = await axios.get(`${BASE_URL}/health`);
      return response.data;
    }
  },

  /** Get all past research reports (lightweight summaries) */
  getAllReports: async () => {
    const response = await api.get('/research');
    return response.data;
  },

  /** Get a single report by ID (full result + agent logs) */
  getReportById: async (id) => {
    const response = await api.get(`/research/${id}`);
    return response.data;
  },

  /**
   * Start a new research task.
   * @param {Object} params - { query, domain, depth, model }
   */
  startResearch: async ({ query, domain = 'General Logistics', depth = 'standard', model = 'gemini-1.5-flash' }) => {
    const response = await api.post('/research', { query, domain, depth, model });
    return response.data;
  },

  /** Delete a report */
  deleteReport: async (id) => {
    const response = await api.delete(`/research/${id}`);
    return response.data;
  },

  /**
   * Search reports by keyword (searches query text and domain).
   * @param {string} keyword
   */
  searchReports: async (keyword) => {
    const response = await api.get('/research/search', { params: { q: keyword } });
    return response.data;
  },

  /** Base URL for SSE streams */
  getStreamUrl: (taskId) => `${BASE_URL}/api/research/${taskId}/stream`,
};
