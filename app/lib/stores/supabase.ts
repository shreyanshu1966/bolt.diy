import { atom } from 'nanostores';
import type { SupabaseUser, SupabaseStats, SupabaseApiKey, SupabaseCredentials } from '~/types/supabase';
import { HAS_MANAGED_SUPABASE } from '~/lib/supabase/managed-client';

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status: string;
  database?: {
    host: string;
    version: string;
    postgres_engine: string;
    release_channel: string;
  };
  created_at: string;
}

export interface SupabaseConnectionState {
  user: SupabaseUser | null;
  token: string;
  stats?: SupabaseStats;
  selectedProjectId?: string;
  isConnected?: boolean;
  project?: SupabaseProject;
  credentials?: SupabaseCredentials;
  managedInstance?: boolean;
}

const savedConnection = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_connection') : null;
const savedCredentials = typeof localStorage !== 'undefined' ? localStorage.getItem('supabaseCredentials') : null;

// If we have managed Supabase, set up initial state differently
const initialState: SupabaseConnectionState = HAS_MANAGED_SUPABASE
  ? {
      user: { email: 'Managed User', role: 'Admin', id: 'managed', created_at: '', last_sign_in_at: '' },
      token: 'managed-token',
      stats: undefined,
      selectedProjectId: 'managed',
      isConnected: true,
      project: {
        id: 'managed',
        name: 'Managed Supabase Instance',
        region: 'managed',
        organization_id: 'managed',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      credentials: {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
      },
      managedInstance: true,
    }
  : savedConnection
    ? JSON.parse(savedConnection)
    : {
        user: null,
        token: '',
        stats: undefined,
        selectedProjectId: undefined,
        isConnected: false,
        project: undefined,
        managedInstance: false,
      };

if (!HAS_MANAGED_SUPABASE && savedCredentials && !initialState.credentials) {
  try {
    initialState.credentials = JSON.parse(savedCredentials);
  } catch (e) {
    console.error('Failed to parse saved credentials:', e);
  }
}

export const supabaseConnection = atom<SupabaseConnectionState>(initialState);

// Only fetch stats if not using managed instance
if (!HAS_MANAGED_SUPABASE && initialState.token && !initialState.stats) {
  fetchSupabaseStats(initialState.token).catch(console.error);
}

export const isConnecting = atom(false);
export const isFetchingStats = atom(false);
export const isFetchingApiKeys = atom(false);

export function updateSupabaseConnection(connection: Partial<SupabaseConnectionState>) {
  const currentState = supabaseConnection.get();

  // Skip updates if we're using managed instance and trying to override it
  if (HAS_MANAGED_SUPABASE && currentState.managedInstance && !connection.managedInstance) {
    return;
  }

  if (connection.user !== undefined || connection.token !== undefined) {
    const newUser = connection.user !== undefined ? connection.user : currentState.user;
    const newToken = connection.token !== undefined ? connection.token : currentState.token;
    connection.isConnected = !!(newUser && newToken);
  }

  if (connection.selectedProjectId !== undefined) {
    if (connection.selectedProjectId && currentState.stats?.projects) {
      const selectedProject = currentState.stats.projects.find(
        (project) => project.id === connection.selectedProjectId,
      );

      if (selectedProject) {
        connection.project = selectedProject;
      } else {
        connection.project = {
          id: connection.selectedProjectId,
          name: `Project ${connection.selectedProjectId.substring(0, 8)}...`,
          region: 'unknown',
          organization_id: '',
          status: 'active',
          created_at: new Date().toISOString(),
        };
      }
    } else if (connection.selectedProjectId === '') {
      connection.project = undefined;
      connection.credentials = undefined;
    }
  }

  const newState = { ...currentState, ...connection };
  supabaseConnection.set(newState);

  /*
   * Only save to localStorage if not using managed instance
   */
  if (
    !HAS_MANAGED_SUPABASE &&
    (connection.user || connection.token || connection.selectedProjectId !== undefined || connection.credentials)
  ) {
    localStorage.setItem('supabase_connection', JSON.stringify(newState));

    if (newState.credentials) {
      localStorage.setItem('supabaseCredentials', JSON.stringify(newState.credentials));
    } else {
      localStorage.removeItem('supabaseCredentials');
    }
  } else if (!HAS_MANAGED_SUPABASE) {
    localStorage.removeItem('supabase_connection');
    localStorage.removeItem('supabaseCredentials');
  }
}

export async function fetchSupabaseStats(token: string) {
  // Skip if using managed instance
  if (HAS_MANAGED_SUPABASE) {
    return;
  }

  isFetchingStats.set(true);

  try {
    // Use the internal API route instead of direct Supabase API call
    const response = await fetch('/api/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const data = (await response.json()) as any;

    updateSupabaseConnection({
      user: data.user,
      stats: data.stats,
    });
  } catch (error) {
    console.error('Failed to fetch Supabase stats:', error);
    throw error;
  } finally {
    isFetchingStats.set(false);
  }
}

export async function fetchProjectApiKeys(projectId: string, token: string) {
  // Skip if using managed instance
  if (HAS_MANAGED_SUPABASE) {
    return null;
  }

  isFetchingApiKeys.set(true);

  try {
    const response = await fetch('/api/supabase/variables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        token,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API keys');
    }

    const data = (await response.json()) as any;
    const apiKeys = data.apiKeys;

    const anonKey = apiKeys.find((key: SupabaseApiKey) => key.name === 'anon' || key.name === 'public');

    if (anonKey) {
      const supabaseUrl = `https://${projectId}.supabase.co`;

      updateSupabaseConnection({
        credentials: {
          anonKey: anonKey.api_key,
          supabaseUrl,
        },
      });

      return { anonKey: anonKey.api_key, supabaseUrl };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch project API keys:', error);
    throw error;
  } finally {
    isFetchingApiKeys.set(false);
  }
}
