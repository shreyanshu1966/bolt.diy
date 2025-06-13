import { useState, useCallback } from 'react';
import { useManagedSupabase } from './useManagedSupabase';
import { useTimeSeriesData } from './useTimeSeriesData';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('event-tracking');

export interface EventOptions {
  /**
   * The event category (e.g., 'user', 'system', 'performance')
   */
  category: string;

  /**
   * Optional metadata for the event (will be stored as JSON)
   */
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking events and metrics in the application
 * Automatically stores events in the time_series_data table
 */
export function useEventTracking() {
  const { supabase, isConnected } = useManagedSupabase();
  const [isTracking, setIsTracking] = useState(true);

  // We use the existing time series data infrastructure
  const { addDataPoint, addBulkDataPoints, loading, error } = useTimeSeriesData({
    seriesName: 'events',
    aggregation: 'none',
  });

  /**
   * Track a numeric event (e.g., page views, button clicks)
   */
  const trackEvent = useCallback(
    async (eventName: string, value: number = 1, options?: EventOptions) => {
      if (!isTracking || !isConnected) {
        return false;
      }

      try {
        const result = await addDataPoint(value, options?.category || 'app');

        // If we have metadata, update the record with JSON data
        if (result && options?.metadata && supabase) {
          // We don't have direct access to the created ID, so we need to query by timestamp
          const timestamp = new Date();
          const { error } = await supabase
            .from('time_series_data')
            .update({ json_data: options.metadata })
            .eq('series_name', 'events')
            .eq('timestamp', timestamp.toISOString());

          if (error) {
            logger.error('Failed to update event metadata:', error);
          }
        }

        return result;
      } catch (err) {
        logger.error('Error tracking event:', err);
        return false;
      }
    },
    [isTracking, isConnected, addDataPoint, supabase],
  );

  /**
   * Track multiple events at once
   */
  const trackEvents = useCallback(
    async (events: Array<{ name: string; value?: number; options?: EventOptions }>) => {
      if (!isTracking || !isConnected) {
        return false;
      }

      try {
        const dataPoints = events.map((event) => ({
          value: event.value || 1,
          category: event.options?.category || 'app',
          timestamp: new Date(),
        }));

        return await addBulkDataPoints(dataPoints);
      } catch (err) {
        logger.error('Error tracking multiple events:', err);
        return false;
      }
    },
    [isTracking, isConnected, addBulkDataPoints],
  );

  /**
   * Enable or disable event tracking
   */
  const setTrackingEnabled = useCallback((enabled: boolean) => {
    setIsTracking(enabled);
  }, []);

  return {
    trackEvent,
    trackEvents,
    setTrackingEnabled,
    isTracking,
    isLoading: loading,
    error,
  };
}
