// Quick test script to verify AI Agent system
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

const testAgentEndpoints = async () => {
  console.log('Testing AI Agent API endpoints...\n');

  const endpoints = [
    { name: 'Agent Status', url: '/api/agents/status' },
    { name: 'Agent Actions', url: '/api/agents/actions?limit=5' },
    { name: 'ML Predictions', url: '/api/agents/ml/predictions' },
    { name: 'Performance Report', url: '/api/agents/performance/report' },
    { name: 'Security Report', url: '/api/agents/security/report' },
    { name: 'Agent Config', url: '/api/agents/config' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const response = await fetch(`${BASE_URL}${endpoint.url}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint.name}: Success`);
        console.log(`   Response keys: ${Object.keys(data).join(', ')}\n`);
      } else {
        console.log(`❌ ${endpoint.name}: Failed (${response.status})`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText}\n`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}\n`);
    }
  }
};

// Run the test
testAgentEndpoints().catch(console.error);