/**
 * Test script to verify managed Supabase detection
 */

import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2);
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

console.log('🔍 Managed Supabase Detection Test');
console.log('==================================');

// Check environment variables
const hasUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const hasAnonKey = !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const hasManagedSupabase = hasUrl && hasAnonKey;

console.log(`HAS_MANAGED_SUPABASE: ${hasManagedSupabase}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '[PRESENT]' : 'Not set'}`);
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL || 'Not set'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);

if (hasManagedSupabase) {
  console.log('✅ Managed Supabase is configured and ready!');
  console.log('\n🎯 Next step: Set up database functions');
  console.log('   Run: npm run setup:supabase-functions');
} else {
  console.log('⚠️  Managed Supabase is not configured.');
  console.log('   Run: npm run setup:supabase to configure it.');
}
