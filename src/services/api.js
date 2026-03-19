// src/services/api.js

// 🔴 IMPORTANT: Unga backend URL inga podu
const API_BASE_URL = 'http://localhost:5000/api';  // Flask server URL

class ApiService {
  async fetchAPI(endpoint, options = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('Calling API:', url);  // Debug panna
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // GET Methods - Unga Flask endpoints match panni irukku
  async getIoTData() {
    return this.fetchAPI('/iot-data');  // GET /api/iot-data
  }

  async getMLPredictions() {
    return this.fetchAPI('/ml-predictions');  // GET /api/ml-predictions
  }

  async getAlerts(limit = 50) {
    return this.fetchAPI(`/alerts?limit=${limit}`);  // GET /api/alerts?limit=50
  }

  async getHistoricalData(days = 7) {
    return this.fetchAPI(`/historical-data?days=${days}`);  // GET /api/historical-data?days=7
  }

  async getBlockchainInfo() {
    return this.fetchAPI('/blockchain/info');  // GET /api/blockchain/info
  }

  async healthCheck() {
    return this.fetchAPI('/health');  // GET /api/health
  }

  // POST Method
  async submitReport(reportData) {
    return this.fetchAPI('/reports', {  // POST /api/reports
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }
}

export default new ApiService();