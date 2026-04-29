import axios from 'axios';

const isProd = import.meta.env.PROD;
const BASE_URL = import.meta.env.VITE_API_URL || (isProd ? '' : 'http://localhost:8000');

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

// ==============================================
// LOGISTICS CI/CD TRACKER API (FLASK BACKEND)
// ==============================================

const TRACKER_URL = import.meta.env.VITE_TRACKER_API_URL || (isProd ? '/tracker' : 'http://localhost:5000');

const trackerApi = axios.create({
  baseURL: TRACKER_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const trackerService = {
  getHealth: async () => {
    try {
      const response = await axios.get(`${TRACKER_URL}/health`);
      return response.data;
    } catch {
      return { status: 'DOWN' };
    }
  },
  
  getShipments: async () => {
    const response = await trackerApi.get('/shipments');
    return response.data;
  },

  getInventory: async () => {
    const response = await trackerApi.get('/inventory');
    return response.data;
  },
  
  createShipment: async (data) => {
    const response = await trackerApi.post('/shipment', data);
    return response.data;
  },
  
  createInventory: async (data) => {
    const response = await trackerApi.post('/inventory', data);
    return response.data;
  },

  trackShipment: async (id) => {
    const response = await trackerApi.get(`/shipment/${id}`);
    return response.data;
  },

  lookupInventoryItem: async (id) => {
    const response = await trackerApi.get(`/inventory/${id}`);
    return response.data;
  },

  createOrder: async (data) => {
    const response = await trackerApi.post('/order', data);
    return response.data;
  },

  trackOrder: async (id) => {
    const response = await trackerApi.get(`/order/${id}`);
    return response.data;
  },

  optimizeRoute: async (data) => {
    const response = await trackerApi.post('/route/optimize', data);
    return response.data;
  }
};
