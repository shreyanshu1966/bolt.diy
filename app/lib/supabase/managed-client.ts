import { createClient } from '@supabase/supabase-js';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('managed-supabase');

// These values should be set in your environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Check if we have managed Supabase credentials
export const HAS_MANAGED_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Create a single instance of the Supabase client to be used throughout the app
export const managedSupabase = HAS_MANAGED_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Helper function to check if Supabase connection is valid
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!managedSupabase) {
    return false;
  }

  try {
    // Simple query to check if the connection is working
    const { error } = await managedSupabase.from('_health_check').select('*').limit(1);

    // If we get a permission error, that's fine - it means the connection is working
    return !error || error.code === 'PGRST116'; // Table not found is OK
  } catch (error) {
    logger.error('Managed Supabase connection error:', error);
    return false;
  }
}

// Database schema detection utilities
interface TableDefinition {
  name: string;
  columns: {
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
  }[];
}

// This function analyzes user requests to determine required database tables
export function detectRequiredTables(prompt: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Authentication tables
  if (
    lowerPrompt.includes('sign up') ||
    lowerPrompt.includes('authentication') ||
    lowerPrompt.includes('user') ||
    lowerPrompt.includes('profile')
  ) {
    tables.push({
      name: 'profiles',
      columns: [
        { name: 'id', type: 'uuid', isNullable: false, isPrimary: true },
        { name: 'user_id', type: 'uuid', isNullable: false, isPrimary: false },
        { name: 'full_name', type: 'text', isNullable: true, isPrimary: false },
        { name: 'avatar_url', type: 'text', isNullable: true, isPrimary: false },
        { name: 'created_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
        { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
      ],
    });
  }

  // Messaging/Chat tables
  if (lowerPrompt.includes('chat') || lowerPrompt.includes('message') || lowerPrompt.includes('conversation')) {
    tables.push({
      name: 'messages',
      columns: [
        { name: 'id', type: 'uuid', isNullable: false, isPrimary: true },
        { name: 'user_id', type: 'uuid', isNullable: false, isPrimary: false },
        { name: 'content', type: 'text', isNullable: false, isPrimary: false },
        { name: 'created_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
      ],
    });
  }

  // Blog/Post tables
  if (lowerPrompt.includes('blog') || lowerPrompt.includes('post') || lowerPrompt.includes('article')) {
    tables.push({
      name: 'posts',
      columns: [
        { name: 'id', type: 'uuid', isNullable: false, isPrimary: true },
        { name: 'user_id', type: 'uuid', isNullable: false, isPrimary: false },
        { name: 'title', type: 'text', isNullable: false, isPrimary: false },
        { name: 'content', type: 'text', isNullable: false, isPrimary: false },
        { name: 'published', type: 'boolean', isNullable: false, isPrimary: false },
        { name: 'created_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
        { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
      ],
    });
  }

  // Todo/Task tables
  if (lowerPrompt.includes('todo') || lowerPrompt.includes('task') || lowerPrompt.includes('checklist')) {
    tables.push({
      name: 'todos',
      columns: [
        { name: 'id', type: 'uuid', isNullable: false, isPrimary: true },
        { name: 'user_id', type: 'uuid', isNullable: false, isPrimary: false },
        { name: 'title', type: 'text', isNullable: false, isPrimary: false },
        { name: 'description', type: 'text', isNullable: true, isPrimary: false },
        { name: 'completed', type: 'boolean', isNullable: false, isPrimary: false },
        { name: 'created_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
        { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
      ],
    });
  }

  // Time-series/Analytics tables
  if (
    lowerPrompt.includes('chart') ||
    lowerPrompt.includes('graph') ||
    lowerPrompt.includes('visualization') ||
    lowerPrompt.includes('dashboard') ||
    lowerPrompt.includes('analytics') ||
    lowerPrompt.includes('metrics') ||
    lowerPrompt.includes('stats') ||
    lowerPrompt.includes('time series') ||
    lowerPrompt.includes('timeseries')
  ) {
    tables.push({
      name: 'time_series_data',
      columns: [
        { name: 'id', type: 'uuid', isNullable: false, isPrimary: true },
        { name: 'user_id', type: 'uuid', isNullable: false, isPrimary: false },
        { name: 'series_name', type: 'text', isNullable: false, isPrimary: false },
        { name: 'category', type: 'text', isNullable: true, isPrimary: false },
        { name: 'timestamp', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
        { name: 'numeric_value', type: 'double precision', isNullable: true, isPrimary: false },
        { name: 'text_value', type: 'text', isNullable: true, isPrimary: false },
        { name: 'json_data', type: 'jsonb', isNullable: true, isPrimary: false },
        { name: 'created_at', type: 'timestamp with time zone', isNullable: false, isPrimary: false },
      ],
    });
  }

  return tables;
}

// Check if table exists in the database
export async function tableExists(tableName: string): Promise<boolean> {
  if (!managedSupabase) {
    return false;
  }

  try {
    // First try to use the check_table_exists function
    const { data, error } = await managedSupabase.rpc('check_table_exists', { table_name: tableName });

    if (error) {
      // If the function itself doesn't exist, create it first
      if (error.code === '42883') {
        logger.info('Creating check_table_exists function');

        const createFunctionSQL = `
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$;
`;

        // Try to create the function
        const { error: createError } = await managedSupabase.rpc('sql', { query: createFunctionSQL });

        if (createError) {
          logger.error('Failed to create check_table_exists function:', createError);
        } else {
          // Try the function again now that it's created
          const { data: retryData, error: retryError } = await managedSupabase.rpc('check_table_exists', {
            table_name: tableName,
          });

          if (!retryError) {
            return !!retryData;
          }
        }
      }

      // Final fallback: try to query the table directly
      const { error: queryError } = await managedSupabase.from(tableName).select('*').limit(1);

      // Table exists if we don't get a "relation does not exist" error
      return !queryError || !queryError.message.includes('does not exist');
    }

    return !!data;
  } catch (error) {
    logger.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Generate SQL for table creation
export function generateTableCreationSQL(tableName: string, prompt: string): string {
  const tables = detectRequiredTables(prompt);
  const matchingTable = tables.find((t) => t.name === tableName);

  if (!matchingTable) {
    return '';
  }

  const columns = matchingTable.columns.map((col) => {
    const nullableStr = col.isNullable ? 'NULL' : 'NOT NULL';
    const defaultStr = col.isPrimary
      ? 'DEFAULT gen_random_uuid()'
      : col.name === 'created_at' || col.name === 'updated_at'
        ? 'DEFAULT now()'
        : col.type === 'boolean'
          ? 'DEFAULT false'
          : '';
    const primaryKeyStr = col.isPrimary ? 'PRIMARY KEY' : '';

    return `  ${col.name} ${col.type} ${defaultStr} ${nullableStr} ${primaryKeyStr}`.trim().replace(/\s+/g, ' ');
  });

  return `
-- Create ${tableName} table
CREATE TABLE IF NOT EXISTS ${tableName} (
${columns.join(',\n')}
);

-- Add RLS policies
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Default policy (authenticated users can see their own data)
CREATE POLICY IF NOT EXISTS "${tableName}_auth_select" ON ${tableName} FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY IF NOT EXISTS "${tableName}_auth_insert" ON ${tableName} FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "${tableName}_auth_update" ON ${tableName} FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "${tableName}_auth_delete" ON ${tableName} FOR DELETE 
  USING (auth.uid() = user_id);
`.trim();
}

// Schema generation utilities
export async function ensureRequiredTablesExist(prompt: string): Promise<boolean> {
  if (!managedSupabase) {
    logger.warn('No managed Supabase instance available');
    return false;
  }

  try {
    const requiredTables = detectRequiredTables(prompt);
    let tablesCreated = false;

    for (const table of requiredTables) {
      const exists = await tableExists(table.name);

      if (!exists) {
        const sql = generateTableCreationSQL(table.name, prompt);
        logger.info(`Table ${table.name} does not exist. Creating table with SQL: ${sql}`);

        // Execute the SQL to create the table
        try {
          const { error } = await managedSupabase.rpc('sql', { query: sql });

          if (error) {
            logger.error(`Error creating table ${table.name}:`, error);
          } else {
            logger.info(`Successfully created table ${table.name}`);
            tablesCreated = true;
          }
        } catch (sqlError) {
          logger.error(`Exception during table creation for ${table.name}:`, sqlError);
        }
      }
    }

    // If we created any tables, also make sure the sql() function exists
    if (tablesCreated) {
      await ensureSqlFunctionExists();
    }

    return true;
  } catch (error) {
    logger.error('Error ensuring required tables exist:', error);
    return false;
  }
}

// Helper function to ensure the SQL function exists in the database
async function ensureSqlFunctionExists(): Promise<boolean> {
  if (!managedSupabase) {
    return false;
  }

  // Test if the SQL function already exists
  try {
    const { /* data not used */ error } = await managedSupabase.rpc('sql', { query: "SELECT 'SQL function test'" });

    if (!error) {
      logger.info('SQL function already exists');
      return true;
    }

    // Function doesn't exist or has an error, so create it
    logger.info('SQL function needs to be created');

    // Create the SQL function directly using a raw query
    const createFunctionSQL = `
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION sql(text) TO service_role;
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
`;

    // Use REST API directly to create the function
    const { error: functionError } = await managedSupabase.rpc('sql', { query: createFunctionSQL });

    if (functionError) {
      logger.error('Error creating SQL function:', functionError);
      return false;
    }

    logger.info('SQL function created successfully');

    return true;
  } catch (error) {
    logger.error('Error ensuring SQL function exists:', error);
    return false;
  }
}

// Ensure that the time series table exists specifically (for chart usage)
export async function ensureTimeSeriesTableExists(): Promise<boolean> {
  if (!managedSupabase) {
    logger.warn('No managed Supabase instance available');
    return false;
  }

  try {
    const exists = await tableExists('time_series_data');

    if (!exists) {
      logger.info('Creating time_series_data table');

      const sql = `
-- Create time_series_data table
CREATE TABLE IF NOT EXISTS time_series_data (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  series_name text NOT NULL,
  category text,
  timestamp timestamp with time zone NOT NULL,
  numeric_value double precision,
  text_value text,
  json_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS time_series_data_series_name_idx ON time_series_data (series_name);
CREATE INDEX IF NOT EXISTS time_series_data_timestamp_idx ON time_series_data (timestamp);
CREATE INDEX IF NOT EXISTS time_series_data_user_id_idx ON time_series_data (user_id);

-- Add RLS policies
ALTER TABLE time_series_data ENABLE ROW LEVEL SECURITY;

-- Default policy (authenticated users can see their own data)
CREATE POLICY IF NOT EXISTS "time_series_data_auth_select" ON time_series_data FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY IF NOT EXISTS "time_series_data_auth_insert" ON time_series_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "time_series_data_auth_update" ON time_series_data FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "time_series_data_auth_delete" ON time_series_data FOR DELETE 
  USING (auth.uid() = user_id);
`;

      const { error } = await managedSupabase.rpc('sql', { query: sql });

      if (error) {
        logger.error('Error creating time_series_data table:', error);
        return false;
      } else {
        logger.info('Successfully created time_series_data table');
        return true;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error ensuring time_series_data table exists:', error);
    return false;
  }
}
