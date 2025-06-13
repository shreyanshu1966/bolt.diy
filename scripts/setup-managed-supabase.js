#!/usr/bin/env node

/**
 * Managed Supabase Setup Script
 * 
 * This script helps you set up the managed Supabase integration for bolt.diy.
 * It will create the necessary environment variables and configuration.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Framework detection function
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupManagedSupabase() {
  console.log('🚀 bolt.diy Managed Supabase Setup\n');
  console.log('This script will help you configure managed Supabase for bolt.diy.');
  console.log('Users will no longer need to connect their own Supabase accounts.\n');
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Found existing .env file\n');
  } else {
    console.log('📝 Creating new .env file\n');
  }

  // Get Supabase configuration
  console.log('Please provide your Supabase project details:');
  console.log('(You can find these in your Supabase dashboard under Settings > API)\n');

  const supabaseUrl = await question('Supabase Project URL (e.g., https://xyz.supabase.co): ');
  const anonKey = await question('Supabase anon/public key: ');
  const serviceKey = await question('Supabase service_role key: ');

  // Validate inputs
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.log('\n❌ Error: All fields are required!');
    process.exit(1);
  }

  if (!supabaseUrl.includes('supabase.co')) {
    console.log('\n❌ Error: Invalid Supabase URL format!');
    process.exit(1);
  }
  // Detect project framework
  const frameworkConfig = detectFramework();
  console.log(`\n🔍 Detected framework: ${frameworkConfig.name}`);

  // Update environment variables with framework-specific prefixes
  const supabaseConfig = `
# Managed Supabase Configuration (for fully managed experience)
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_KEY=${serviceKey}
ENABLE_MANAGED_SUPABASE=true

# Framework-specific variables (for client-side access)
${frameworkConfig.envVars.url}=${supabaseUrl}
${frameworkConfig.envVars.anonKey}=${anonKey}
`;

  // Remove existing Supabase config if present
  envContent = envContent
    .replace(/# Managed Supabase Configuration[\s\S]*?(?=\n# |$)/g, '')
    .replace(/SUPABASE_URL=.*\n/g, '')
    .replace(/SUPABASE_ANON_KEY=.*\n/g, '')
    .replace(/SUPABASE_SERVICE_KEY=.*\n/g, '')
    .replace(/ENABLE_MANAGED_SUPABASE=.*\n/g, '')
    .replace(/VITE_SUPABASE_URL=.*\n/g, '')
    .replace(/VITE_SUPABASE_ANON_KEY=.*\n/g, '')
    .replace(/NEXT_PUBLIC_SUPABASE_URL=.*\n/g, '')
    .replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*\n/g, '')
    .replace(/NUXT_SUPABASE_URL=.*\n/g, '')
    .replace(/NUXT_SUPABASE_ANON_KEY=.*\n/g, '')
    .replace(/PUBLIC_SUPABASE_URL=.*\n/g, '')
    .replace(/PUBLIC_SUPABASE_ANON_KEY=.*\n/g, '');

  // Add new configuration
  envContent += supabaseConfig;

  // Write to file
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Successfully configured managed Supabase!');
  console.log('\n🔧 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Set up required SQL functions in your Supabase database:');
  console.log('   Open your Supabase dashboard > SQL Editor');
  console.log('   Copy and run the SQL from: docs/SUPABASE_FUNCTIONS_SETUP.md');
  console.log('3. Enable Row Level Security (RLS) on your Supabase tables');
  console.log('4. Test with: npm run test:supabase');
  console.log('\n🎉 Users can now create database-powered apps without any setup!');
  
  rl.close();
}

// Handle errors gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled by user');
  rl.close();
  process.exit(0);
});

setupManagedSupabase().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
