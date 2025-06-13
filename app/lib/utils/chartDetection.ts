import type { TimeSeriesDataPoint } from '~/lib/hooks/useTimeSeriesData';
import { createScopedLogger } from '~/utils/logger';

// Either use the logger or add a comment to disable the linting rule:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = createScopedLogger('chart-detection');

/**
 * Types of charts available in the system
 */
export type ChartType =
  | 'line' // For trends over time
  | 'bar' // For comparisons between categories
  | 'pie' // For showing proportions
  | 'scatter' // For showing correlations
  | 'area' // For cumulative data
  | 'radar' // For multivariate data
  | 'bubble' // For three-dimensional data
  | 'gauge'; // For showing progress towards a goal

/**
 * Chart suggestions with confidence scores
 */
export interface ChartSuggestion {
  type: ChartType;
  confidence: number; // 0-100 confidence score
  reason: string; // Explanation for why this chart type is suggested
}

/**
 * Analyzes time series data and suggests appropriate chart types
 */
export function detectChartType(data: TimeSeriesDataPoint[]): ChartSuggestion[] {
  if (!data || data.length === 0) {
    return [{ type: 'line', confidence: 80, reason: 'Default chart type for time series data' }];
  }

  const suggestions: ChartSuggestion[] = [];

  // Check trend indicators (is the data trending upward/downward over time)
  const hasTrend = detectTrend(data);

  // Check for seasonal patterns (repeating patterns over time)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasSeasonal = detectSeasonalPattern(data); // Used in future implementation for seasonal pattern detection

  // Check if data points are evenly distributed over time
  const isEventlyDistributed = isTimeEventlyDistributed(data);

  // Check the number of unique categories
  const uniqueCategories = countUniqueCategories(data);

  // Check data value range (high variance suggests scatter plot)
  const valueRange = calculateValueRange(data);

  // Check for outliers (may affect chart type decision)
  const outlierCount = detectOutliers(data);

  // Chart type suggestions based on data characteristics

  // Line chart is good for time series trends
  suggestions.push({
    type: 'line',
    confidence: hasTrend ? 90 : isEventlyDistributed ? 85 : 70,
    reason: hasTrend
      ? 'Data shows a clear trend over time, ideal for line charts'
      : 'Time series data works well with line charts',
  });

  // Bar chart is good for comparing discrete categories
  if (uniqueCategories > 1 && uniqueCategories < 15) {
    suggestions.push({
      type: 'bar',
      confidence: uniqueCategories > 3 ? 85 : 70,
      reason: `${uniqueCategories} distinct categories, good for bar comparison`,
    });
  }

  // Pie chart for proportional data with few categories
  if (uniqueCategories > 1 && uniqueCategories <= 7) {
    suggestions.push({
      type: 'pie',
      confidence: uniqueCategories <= 5 ? 75 : 60,
      reason: `${uniqueCategories} categories, suitable for showing proportions`,
    });
  }

  // Area chart for cumulative values
  if (hasTrend && valueRange.min >= 0) {
    suggestions.push({
      type: 'area',
      confidence: 75,
      reason: 'Positive values with trend, good for showing cumulative data',
    });
  }

  // Scatter plot for irregular or high-variance data
  if (!isEventlyDistributed || outlierCount > 2) {
    suggestions.push({
      type: 'scatter',
      confidence: outlierCount > 2 ? 80 : 65,
      reason:
        outlierCount > 2
          ? 'Data contains outliers, scatter plot shows distribution well'
          : 'Irregularly distributed data points',
    });
  }

  // Sort by confidence score
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect if there is a trend in the data
 */
function detectTrend(data: TimeSeriesDataPoint[]): boolean {
  // Simple trend detection by comparing first 1/3 and last 1/3 of data
  const n = data.length;

  if (n < 6) {
    return false;
  }

  const firstThird = data.slice(0, Math.floor(n / 3));
  const lastThird = data.slice(Math.floor((2 * n) / 3));

  const firstAvg = firstThird.reduce((sum, point) => sum + point.value, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, point) => sum + point.value, 0) / lastThird.length;

  // If there's at least a 10% difference, consider it a trend
  return Math.abs(lastAvg - firstAvg) > firstAvg * 0.1;
}

/**
 * Check if data points are evenly distributed over time
 */
function isTimeEventlyDistributed(data: TimeSeriesDataPoint[]): boolean {
  if (data.length < 3) {
    return true;
  }

  const intervals: number[] = [];

  for (let i = 1; i < data.length; i++) {
    intervals.push(data[i].timestamp.getTime() - data[i - 1].timestamp.getTime());
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // If standard deviation is less than 30% of average interval, consider it evenly distributed
  return stdDev < avgInterval * 0.3;
}

/**
 * Count unique categories in the data
 */
function countUniqueCategories(data: TimeSeriesDataPoint[]): number {
  const categories = new Set<string>();

  data.forEach((point) => {
    if (point.category) {
      categories.add(point.category);
    }
  });

  return categories.size || 1; // Default to 1 if no categories
}

/**
 * Calculate data value range
 */
function calculateValueRange(data: TimeSeriesDataPoint[]): { min: number; max: number; range: number } {
  if (data.length === 0) {
    return { min: 0, max: 0, range: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  data.forEach((point) => {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
  });

  return {
    min,
    max,
    range: max - min,
  };
}

/**
 * Detect seasonal patterns in the data
 */
function detectSeasonalPattern(data: TimeSeriesDataPoint[]): boolean {
  // Simple detection - requires substantial data points
  if (data.length < 20) {
    return false;
  }

  // Check for daily patterns (comparing similar times of day)
  const hourMap: Record<number, number[]> = {};

  data.forEach((point) => {
    const hour = point.timestamp.getHours();

    if (!hourMap[hour]) {
      hourMap[hour] = [];
    }

    hourMap[hour].push(point.value);
  });

  // Check if more than 3 hours have consistent patterns
  const hoursWithPatterns = Object.keys(hourMap).filter((hour) => {
    const values = hourMap[parseInt(hour)];

    if (values.length < 3) {
      return false;
    }

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Low standard deviation indicates consistency
    return stdDev < avg * 0.3;
  });

  return hoursWithPatterns.length >= 3;
}

/**
 * Detect outliers in the data
 */
function detectOutliers(data: TimeSeriesDataPoint[]): number {
  if (data.length < 4) {
    return 0;
  }

  const values = data.map((point) => point.value);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Count points that are more than 2 standard deviations from the mean
  const outliers = values.filter((val) => Math.abs(val - avg) > 2 * stdDev);

  return outliers.length;
}
