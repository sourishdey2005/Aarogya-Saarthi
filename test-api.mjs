import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';

const apiPort = 8787;
const frontendPort = 5173;

// Start API server
import { startApiServer } from './server/api.ts';
startApiServer({ sql: null as any, port: 8787 }).then(() => {
  console.log('API server started on 8787');
});

// Test API
async function test() {
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    const healthRes = await fetch('http://localhost:8787/api/health');
    const health = await healthRes.json();
    console.log('Health check:', health.status, health.database);
  } catch (e) {
    console.log('API health check failed:', e.message);
  }

  const patientsRes = await fetch('http://localhost:8787/api/patients', {
    headers: { 'authorization': 'Bearer 00000000-0000-0000-0000-000000000001' }
  });
  const patients = await patientsRes.json();
  console.log('Patients:', patients.patients?.length, 'patients found');
  
  const syncRes = await fetch(`${API_BASE_URL}/api/sync/pending`, {
    headers: { authorization: 'Bearer 00000000-0000-0000-0000-000000000001' }
  });
  const syncData = await syncRes.json();
  console.log('Sync status:', syncData.pending_count, 'pending');
  
  process.exit(0);
}

test().catch(e => console.error('Test failed:', e));