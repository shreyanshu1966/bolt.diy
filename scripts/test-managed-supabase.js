/**
 * Test script to verify managed Supabase detection
 */

console.log('🔍 Managed Supabase Detection Test');
console.log('==================================');

// Check environment variables
const hasUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const hasAnonKey = !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const hasManagedSupabase = hasUrl && hasAnonKey;

console.log(`HAS_MANAGED_SUPABASE: ${hasManagedSupabase}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL || 'Not set'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);

if (hasManagedSupabase) {
  console.log('✅ Managed Supabase is configured and ready!');
} else {
  console.log('⚠️  Managed Supabase is not configured.');
  console.log('   Run: npm run setup:supabase to configure it.');
}
