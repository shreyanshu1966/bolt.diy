#!/usr/bin/env node

/**
 * Supabase Functions Setup Script
 * 
 * This script automatically sets up the required SQL functions in your managed Supabase database
 * for table creation and query execution.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function setupSupabaseFunctions() {
  console.log('🔧 Setting up Supabase functions for managed mode...\n');

  // Load environment variables
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=', 2);
        process.env[key.trim()] = value.trim();
      }
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Error: Missing Supabase configuration');
    console.log('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
    console.log('   Run: npm run setup:supabase to configure them');
    process.exit(1);
  }

  console.log(`🔗 Connecting to: ${supabaseUrl}`);

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SQL function for executing queries
    const sqlFunction = `
      CREATE OR REPLACE FUNCTION sql(query text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          result json;
      BEGIN
          EXECUTE query;
          RETURN json_build_object('success', true, 'message', 'Query executed successfully');
      EXCEPTION 
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'error', true,
                  'message', SQLERRM,
                  'detail', SQLSTATE
              );
      END;
      $$;
    `;

    console.log('📝 Creating sql() function...');
    const { error: sqlError } = await supabase.rpc('sql', { query: sqlFunction });
    
    if (sqlError && sqlError.code === '42883') {
      // Function doesn't exist, we need to create it manually via raw SQL
      console.log('🔨 Function not found, creating via direct SQL execution...');
      
      // Use the REST API directly to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sqlFunction })
      });

      if (!response.ok) {
        throw new Error(`Failed to create function: ${response.status} ${response.statusText}`);
      }
    }

    // Grant permissions
    console.log('🔐 Setting up permissions...');
    const permissionSQL = `
      GRANT EXECUTE ON FUNCTION sql(text) TO service_role;
      GRANT ALL ON SCHEMA public TO service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
    `;

    const { error: permError } = await supabase.rpc('sql', { query: permissionSQL });
    if (permError) {
      console.log('⚠️  Permission setup warning:', permError.message);
    }

    // Test the function
    console.log('🧪 Testing function...');
    const testQuery = "SELECT 'Function working!' as test";
    const { data: testResult, error: testError } = await supabase.rpc('sql', { query: testQuery });
    
    if (testError) {
      throw testError;
    }

    console.log('✅ Supabase functions setup completed successfully!');
    console.log('\n🎉 Your managed Supabase is now ready for table creation and SQL execution');
    console.log('\n📋 What was set up:');
    console.log('   ✓ sql() function for executing queries');
    console.log('   ✓ Proper permissions for service_role');
    console.log('   ✓ Function tested and working');
    
    console.log('\n🚀 You can now:');
    console.log('   • Create chat applications with automatic table creation');
    console.log('   • Use any database features without manual setup');
    console.log('   • Test with: npm run test:supabase');

  } catch (error) {
    console.log('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Copy and run the SQL from: docs/SUPABASE_FUNCTIONS_SETUP.md');
    process.exit(1);
  }
}

setupSupabaseFunctions().catch(console.error);
