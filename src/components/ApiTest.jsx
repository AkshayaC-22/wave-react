// src/components/ApiTest.jsx
import React, { useState } from 'react';
import apiService from '../services/api';

const ApiTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testEndpoint = async (endpoint, method) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let data;
      switch(endpoint) {
        case 'health':
          data = await apiService.healthCheck();
          break;
        case 'iot':
          data = await apiService.getIoTData();
          break;
        case 'ml':
          data = await apiService.getMLPredictions();
          break;
        case 'alerts':
          data = await apiService.getAlerts();
          break;
        case 'historical':
          data = await apiService.getHistoricalData();
          break;
        case 'blockchain':
          data = await apiService.getBlockchainInfo();
          break;
        default:
          data = { message: 'Unknown endpoint' };
      }
      setResult(data);
      console.log(`${endpoint} response:`, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testPostReport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const testReport = {
        location: 'Test Location',
        description: 'This is a test report',
        type: 'general',
        priority: 'normal'
      };
      const data = await apiService.submitReport(testReport);
      setResult(data);
      console.log('Report response:', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const endpoints = [
    { name: 'Health Check', endpoint: 'health', method: 'GET' },
    { name: 'IoT Data', endpoint: 'iot', method: 'GET' },
    { name: 'ML Predictions', endpoint: 'ml', method: 'GET' },
    { name: 'Alerts', endpoint: 'alerts', method: 'GET' },
    { name: 'Historical Data', endpoint: 'historical', method: 'GET' },
    { name: 'Blockchain Info', endpoint: 'blockchain', method: 'GET' }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        🔌 API Connection Test - WaveGenix
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
        <p><strong>Backend URL:</strong> {apiService.API_BASE_URL || 'http://localhost:5000/api'}</p>
        <p><strong>Status:</strong> {loading ? '⏳ Testing...' : '✅ Ready'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {endpoints.map((ep) => (
          <button
            key={ep.endpoint}
            onClick={() => testEndpoint(ep.endpoint, ep.method)}
            disabled={loading}
            style={{
              padding: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {ep.name} ({ep.method})
          </button>
        ))}
        
        <button
          onClick={testPostReport}
          disabled={loading}
          style={{
            padding: '12px',
            background: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            gridColumn: 'span 2'
          }}
        >
          Test POST Report
        </button>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#FEE2E2', color: '#DC2626', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ padding: '15px', background: '#EFF6FF', borderRadius: '5px' }}>
          <strong>✅ Response:</strong>
          <pre style={{ marginTop: '10px', overflow: 'auto', maxHeight: '400px', background: '#1F2937', color: '#fff', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest;