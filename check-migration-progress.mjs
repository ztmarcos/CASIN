import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkProgress() {
  try {
    console.log('🔍 Checking Firebase contacts count via API...');
    
    const { stdout } = await execAsync('curl -s "http://localhost:3001/api/directorio/stats"');
    const stats = JSON.parse(stdout);
    
    console.log('📊 Current Firebase contacts:', stats.stats?.total || 'N/A');
    console.log('📈 Migration progress update');
    
  } catch (error) {
    console.log('❌ Could not check progress:', error.message);
  }
}

checkProgress(); 