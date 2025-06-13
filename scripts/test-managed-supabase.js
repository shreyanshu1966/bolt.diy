/**
 * Test script to verify managed Supabase detection for all frameworks
 */

import fs from 'fs';
import path from 'path';

// Framework detection function (same as setup script)
function detectFramework() {
  const cwd = process.cwd();
  
  // Check for Next.js
  if (fs.existsSync(path.join(cwd, 'next.config.js')) || 
      fs.existsSync(path.join(cwd, 'next.config.mjs')) ||
      fs.existsSync(path.join(cwd, 'next.config.ts'))) {
    return {
      name: 'Next.js',
      envVars: {
        url: 'NEXT_PUBLIC_SUPABASE_URL',
        anonKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }
    };
  }
  
  // Check for Nuxt
  if (fs.existsSync(path.join(cwd, 'nuxt.config.js')) || 
      fs.existsSync(path.join(cwd, 'nuxt.config.ts'))) {
    return {
      name: 'Nuxt',
      envVars: {
        url: 'NUXT_SUPABASE_URL',
        anonKey: 'NUXT_SUPABASE_ANON_KEY'
      }
    };
  }
  
  // Check for SvelteKit
  if (fs.existsSync(path.join(cwd, 'svelte.config.js'))) {
    return {
      name: 'SvelteKit',
      envVars: {
        url: 'PUBLIC_SUPABASE_URL',
        anonKey: 'PUBLIC_SUPABASE_ANON_KEY'
      }
    };
  }
  
  // Check for Astro
  if (fs.existsSync(path.join(cwd, 'astro.config.mjs')) || 
      fs.existsSync(path.join(cwd, 'astro.config.js'))) {
    return {
      name: 'Astro',
      envVars: {
        url: 'PUBLIC_SUPABASE_URL',
        anonKey: 'PUBLIC_SUPABASE_ANON_KEY'
      }
    };
  }
  
  // Check for Angular
  if (fs.existsSync(path.join(cwd, 'angular.json'))) {
    return {
      name: 'Angular',
      envVars: {
        url: 'NG_APP_SUPABASE_URL',
        anonKey: 'NG_APP_SUPABASE_ANON_KEY'
      }
    };
  }
  
  // Default to Vite/Remix
  return {
    name: 'Vite/Remix',
    envVars: {
      url: 'VITE_SUPABASE_URL',
      anonKey: 'VITE_SUPABASE_ANON_KEY'
    }
  };
}

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

// Detect framework
const framework = detectFramework();
console.log(`🎯 Detected Framework: ${framework.name}`);
console.log(`📋 Expected env vars: ${framework.envVars.url}, ${framework.envVars.anonKey}\n`);

// Check environment variables - both universal and framework-specific
const hasUniversalUrl = !!process.env.SUPABASE_URL;
const hasUniversalKey = !!process.env.SUPABASE_ANON_KEY;
const hasFrameworkUrl = !!process.env[framework.envVars.url];
const hasFrameworkKey = !!process.env[framework.envVars.anonKey];

const hasManagedSupabase = hasUniversalUrl && hasUniversalKey && hasFrameworkUrl && hasFrameworkKey;

console.log('📊 Environment Variables Status:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);
console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '[PRESENT]' : 'Not set'}`);
console.log(`${framework.envVars.url}: ${process.env[framework.envVars.url] || 'Not set'}`);
console.log(`${framework.envVars.anonKey}: ${process.env[framework.envVars.anonKey] ? '[PRESENT]' : 'Not set'}`);

// Legacy Vite check for compatibility
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL || 'Not set'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : 'Not set'}`);

console.log(`\n🎯 HAS_MANAGED_SUPABASE: ${hasManagedSupabase}`);

if (hasManagedSupabase) {
  console.log('✅ Managed Supabase is configured and ready!');
  console.log(`✅ Framework-specific environment variables are set for ${framework.name}`);
  console.log('\n🎯 Next step: Set up database functions');
  console.log('   Run: npm run setup:supabase-functions');
} else {
  console.log('⚠️  Managed Supabase is not fully configured.');
  console.log('   Issues detected:');
  if (!hasUniversalUrl) console.log('   - Missing SUPABASE_URL');
  if (!hasUniversalKey) console.log('   - Missing SUPABASE_ANON_KEY');
  if (!hasFrameworkUrl) console.log(`   - Missing ${framework.envVars.url}`);
  if (!hasFrameworkKey) console.log(`   - Missing ${framework.envVars.anonKey}`);
  console.log('\n   Run: npm run setup:supabase to configure it.');
}
