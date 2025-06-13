import { useEffect } from 'react';
import { analytics, type AnalyticsEvent } from '~/lib/middleware/analyticsMiddleware';
import { useTimeSeriesData } from './useTimeSeriesData';
import { useManagedSupabase } from './useManagedSupabase';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('analytics-bridge');

/**
 * A hook that bridges analytics events to the time series database
 * This allows analytics data to be automatically visualized in charts
 */
export function useAnalyticsBridge(
  options: {
    enabled?: boolean;
    batchSize?: number;
  } = {},
) {
  const { enabled = true, batchSize = 10 } = options;

  const { supabase, isConnected } = useManagedSupabase();
  const { addBulkDataPoints } = useTimeSeriesData({
    seriesName: 'analytics',
    limit: 1000,
  });

  useEffect(() => {
    if (!enabled || !isConnected) {
      return undefined;
    }

    // Store pending events to batch them
    let pendingEvents: AnalyticsEvent[] = [];

    // Setup the event handler
    const handleAnalyticsEvent = async (event: AnalyticsEvent) => {
      try {
        pendingEvents.push(event);

        // Once we reach the batch size, process them
        if (pendingEvents.length >= batchSize) {
          const eventsToProcess = [...pendingEvents];
          pendingEvents = [];

          // Convert to time series data points
          const dataPoints = eventsToProcess.map((event) => ({
            value: event.value || 1, // Default value for counting occurrences
            category: event.category,
            timestamp: event.timestamp,
          }));

          // Store additional properties as JSON
          if (supabase) {
            const timeSeriesRecords = eventsToProcess.map((event) => ({
              user_id: 'system',
              series_name: 'analytics',
              category: event.category,
              timestamp: event.timestamp,
              numeric_value: event.value || 1,
              json_data: {
                event: event.event,
                action: event.action,
                label: event.label,
                properties: event.properties,
              },
              created_at: new Date(),
            }));

            await supabase.from('time_series_data').insert(timeSeriesRecords);
          } else {
            // Fall back to the basic time series data hook
            await addBulkDataPoints(dataPoints);
          }
        }
      } catch (err) {
        logger.error('Error storing analytics event:', err);
      }
    };

    // Initialize the analytics middleware with our handler
    analytics.initialize(handleAnalyticsEvent);

    return function cleanup() {
      // Process any remaining events
      if (pendingEvents.length > 0) {
        handleAnalyticsEvent(pendingEvents[pendingEvents.length - 1]).catch((err) =>
          logger.error('Error in cleanup:', err),
        );
      }
    };
  }, [isConnected, addBulkDataPoints, supabase, enabled, batchSize]);

  return {
    isEnabled: enabled && isConnected,
    trackEvent: analytics.trackEvent.bind(analytics),
  };
}
