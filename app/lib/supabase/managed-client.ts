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

  return tables;
}

// Check if table exists in the database
export async function tableExists(tableName: string): Promise<boolean> {
  if (!managedSupabase) {
    return false;
  }

  try {
    const { data, error } = await managedSupabase.rpc('check_table_exists', { table_name: tableName });

    if (error) {
      // Fallback: try to query the table directly
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

    for (const table of requiredTables) {
      const exists = await tableExists(table.name);

      if (!exists) {
        const sql = generateTableCreationSQL(table.name, prompt);
        logger.info(`Table ${table.name} does not exist. SQL would be generated: ${sql}`);

        /*
         * In a real implementation, this would be executed via a backend API
         * For now, we just log what would be created
         */
      }
    }

    return true;
  } catch (error) {
    logger.error('Error ensuring required tables exist:', error);
    return false;
  }
}
