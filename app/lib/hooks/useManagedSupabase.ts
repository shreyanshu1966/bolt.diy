import { useEffect, useState } from 'react';
import { managedSupabase, checkSupabaseConnection, HAS_MANAGED_SUPABASE } from '~/lib/supabase/managed-client';

export function useManagedSupabase() {
  const [isConnected, setIsConnected] = useState<boolean>(HAS_MANAGED_SUPABASE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkConnection() {
      if (!HAS_MANAGED_SUPABASE) {
        setIsConnected(false);
        setIsLoading(false);

        return;
      }

      try {
        const connected = await checkSupabaseConnection();
        setIsConnected(connected);
      } catch (error) {
        setIsConnected(false);
        console.error('Failed to connect to managed Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkConnection();
  }, []);

  return {
    supabase: managedSupabase,
    isConnected,
    isLoading,
    hasManagedSupabase: HAS_MANAGED_SUPABASE,
  };
}
