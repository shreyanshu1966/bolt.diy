import { useState, useEffect, useCallback } from 'react';
import { useManagedSupabase } from './useManagedSupabase';
import { createScopedLogger } from '~/utils/logger';
import { ensureTimeSeriesTableExists } from '~/lib/supabase/managed-client';

const logger = createScopedLogger('time-series-hook');

export interface TimeSeriesDataPoint {
  timestamp: Date; // Changed to Date only for consistency
  value: number;
  category?: string;
  label?: string;
}

export interface TimeSeriesOptions {
  seriesName: string;
  category?: string;
  limit?: number;
  orderDirection?: 'asc' | 'desc';
  timeRange?: {
    startDate?: Date;
    endDate?: Date;
  };
  aggregation?: 'none' | 'daily' | 'weekly' | 'monthly';
}

/**
 * React hook for working with time series data stored in Supabase
 */
export function useTimeSeriesData(options: TimeSeriesOptions) {
  const { supabase, isConnected } = useManagedSupabase();
  const [data, setData] = useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tableCreated, setTableCreated] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Ensure time series table exists before proceeding
        if (!tableCreated) {
          const created = await ensureTimeSeriesTableExists();
          setTableCreated(true);

          if (!created) {
            throw new Error('Failed to create time_series_data table');
          }
        }

        let query = supabase
          .from('time_series_data')
          .select('timestamp, numeric_value, category, series_name')
          .eq('series_name', options.seriesName);

        // Filter by category if specified
        if (options.category) {
          query = query.eq('category', options.category);
        }

        // Apply time range filters if specified
        if (options.timeRange?.startDate) {
          query = query.gte('timestamp', options.timeRange.startDate.toISOString());
        }

        if (options.timeRange?.endDate) {
          query = query.lte('timestamp', options.timeRange.endDate.toISOString());
        }

        // Apply ordering
        query = query.order('timestamp', { ascending: options.orderDirection !== 'desc' });

        // Apply limit if specified
        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data: rawData, error } = await query;

        if (error) {
          throw error;
        }

        if (rawData) {
          let processedData: TimeSeriesDataPoint[] = rawData.map((item) => ({
            timestamp: new Date(item.timestamp),
            value: item.numeric_value,
            ...(item.category && { category: item.category }),
            label: formatDateByAggregation(new Date(item.timestamp), options.aggregation || 'none'),
          }));

          // Apply aggregation if needed
          if (options.aggregation && options.aggregation !== 'none') {
            processedData = aggregateTimeSeriesData(processedData, options.aggregation);
          }

          setData(processedData);
        }
      } catch (err: any) {
        logger.error('Error fetching time series data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    supabase,
    isConnected,
    options.seriesName,
    options.category,
    options.limit,
    options.orderDirection,
    options.timeRange,
    options.aggregation,
  ]);

  // Helper function to add a new data point
  const addDataPoint = async (value: number, category?: string, timestamp = new Date()) => {
    if (!supabase || !isConnected) {
      setError(new Error('Not connected to Supabase'));
      return false;
    }

    try {
      const { error } = await supabase.from('time_series_data').insert({
        series_name: options.seriesName,
        category: category || options.category,
        timestamp,
        numeric_value: value,
        created_at: new Date(),
      });

      if (error) {
        throw error;
      }

      // Refresh data after adding a new point
      const newDataPoint: TimeSeriesDataPoint = {
        timestamp,
        value,
        category,
        label: formatDateByAggregation(timestamp, options.aggregation || 'none'),
      };

      setData((currentData) => [...currentData, newDataPoint]);

      return true;
    } catch (err: any) {
      logger.error('Error adding time series data point:', err);
      setError(err);

      return false;
    }
  };

  // Helper function to add multiple data points in bulk
  const addBulkDataPoints = async (dataPoints: Array<{ value: number; category?: string; timestamp?: Date }>) => {
    if (!supabase || !isConnected) {
      setError(new Error('Not connected to Supabase'));
      return false;
    }

    try {
      const formattedDataPoints = dataPoints.map((point) => ({
        series_name: options.seriesName,
        category: point.category || options.category,
        timestamp: point.timestamp || new Date(),
        numeric_value: point.value,
        created_at: new Date(),
      }));

      const { error } = await supabase.from('time_series_data').insert(formattedDataPoints);

      if (error) {
        throw error;
      }

      // Refresh data completely (it's more reliable than trying to merge)
      const { data: refreshedData, error: refreshError } = await supabase
        .from('time_series_data')
        .select('timestamp, numeric_value, category, series_name')
        .eq('series_name', options.seriesName);

      if (refreshError) {
        throw refreshError;
      }

      if (refreshedData) {
        setData(
          refreshedData.map((item) => {
            const dataPoint: TimeSeriesDataPoint = {
              timestamp: new Date(item.timestamp),
              value: item.numeric_value,
              label: formatDateByAggregation(new Date(item.timestamp), options.aggregation || 'none'),
            };

            if (item.category) {
              dataPoint.category = item.category;
            }

            return dataPoint;
          }),
        );
      }

      return true;
    } catch (err: any) {
      logger.error('Error adding bulk time series data:', err);
      setError(err);

      return false;
    }
  };

  // Function to manually refetch the data
  const refetch = useCallback(async () => {
    if (!supabase || !isConnected) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('time_series_data')
        .select('timestamp, numeric_value, category, series_name')
        .eq('series_name', options.seriesName);

      // Filter by category if specified
      if (options.category) {
        query = query.eq('category', options.category);
      }

      // Apply time range filters if specified
      if (options.timeRange?.startDate) {
        query = query.gte('timestamp', options.timeRange.startDate.toISOString());
      }

      if (options.timeRange?.endDate) {
        query = query.lte('timestamp', options.timeRange.endDate.toISOString());
      }

      // Apply ordering
      query = query.order('timestamp', { ascending: options.orderDirection !== 'desc' });

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: rawData, error } = await query;

      if (error) {
        throw error;
      }

      if (rawData) {
        let processedData: TimeSeriesDataPoint[] = rawData.map((item) => ({
          timestamp: new Date(item.timestamp),
          value: item.numeric_value,
          ...(item.category && { category: item.category }),
          label: formatDateByAggregation(new Date(item.timestamp), options.aggregation || 'none'),
        }));

        // Apply aggregation if needed
        if (options.aggregation && options.aggregation !== 'none') {
          processedData = aggregateTimeSeriesData(processedData, options.aggregation);
        }

        setData(processedData);
      }

      return true;
    } catch (err: any) {
      logger.error('Error refetching time series data:', err);
      setError(err);

      return false;
    } finally {
      setLoading(false);
    }
  }, [
    supabase,
    isConnected,
    options.seriesName,
    options.category,
    options.limit,
    options.orderDirection,
    options.timeRange,
    options.aggregation,
  ]);

  return {
    data,
    loading,
    error,
    addDataPoint,
    addBulkDataPoints,
    refetch,
  };
}

// Helper functions for data aggregation and formatting

function formatDateByAggregation(date: Date, aggregation: string): string {
  switch (aggregation) {
    case 'daily':
      return date.toLocaleDateString();
    case 'weekly': {
      // Get start of week
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());

      return `Week of ${startOfWeek.toLocaleDateString()}`;
    }
    case 'monthly':
      return `${date.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`;
    default:
      // Default format for granular data
      return date.toLocaleString();
  }
}

function aggregateTimeSeriesData(
  data: TimeSeriesDataPoint[],
  aggregation: 'daily' | 'weekly' | 'monthly',
): TimeSeriesDataPoint[] {
  // Group data points by the specified aggregation period
  const groupedData: { [key: string]: { sum: number; count: number; timestamp: Date } } = {};

  for (const point of data) {
    const date = point.timestamp; // Already a Date object
    let key = '';

    switch (aggregation) {
      case 'daily': {
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      }
      case 'weekly': {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        key = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
        break;
      }
      case 'monthly': {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
      }
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        sum: 0,
        count: 0,
        timestamp: new Date(date), // Keep the first timestamp for this group
      };
    }

    groupedData[key].sum += point.value;
    groupedData[key].count += 1;
  }

  // Calculate averages and create aggregated data points
  return Object.keys(groupedData).map((key) => {
    const group = groupedData[key];
    const result: TimeSeriesDataPoint = {
      timestamp: group.timestamp,
      value: group.sum / group.count, // Average value
      label: formatDateByAggregation(group.timestamp, aggregation),
      category: 'aggregated', // Mark as aggregated data
    };

    return result;
  });
}
