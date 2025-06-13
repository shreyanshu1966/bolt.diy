import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Scatter, Radar, Bubble } from 'react-chartjs-2';
import { useTimeSeriesData } from '~/lib/hooks/useTimeSeriesData';
import { classNames } from '~/utils/classNames';
import { detectChartType } from '~/lib/utils/chartDetection';
import type { ChartType } from '~/lib/utils/chartDetection';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface TimeSeriesChartProps {
  /**
   * Title for the chart
   */
  title: string;

  /**
   * Name of the time series to display
   */
  seriesName: string;

  /**
   * Optional category filter
   */
  category?: string;

  /**
   * Optional limit of data points to display
   */
  limit?: number;

  /**
   * Direction for ordering data points
   */
  orderDirection?: 'asc' | 'desc';

  /**
   * Time range for filtering data
   */
  timeRange?: {
    startDate?: Date;
    endDate?: Date;
  };

  /**
   * Aggregation method for data points
   */
  aggregation?: 'none' | 'daily' | 'weekly' | 'monthly';

  /**
   * Height of the chart
   */
  height?: string | number;

  /**
   * Line color for the chart
   */
  lineColor?: string;

  /**
   * Background color for the chart area
   */
  backgroundColor?: string;

  /**
   * Y-axis label
   */
  yAxisLabel?: string;

  /**
   * X-axis label
   */
  xAxisLabel?: string;

  /**
   * Chart type to use - if not specified, will auto-detect best chart type
   */
  chartType?: ChartType;

  /**
   * Whether to allow users to switch between chart types
   */
  allowChartTypeSwitch?: boolean;

  /**
   * Whether to enable CSV data export
   */
  enableExport?: boolean;

  /**
   * Whether to enable real-time updates
   */
  enableRealtime?: boolean;

  /**
   * Real-time update interval in milliseconds (default: 30000, i.e., 30 seconds)
   */
  realtimeInterval?: number;

  /**
   * Additional class name for styling
   */
  className?: string;
}

/**
 * A reusable component for displaying time series data with automatic chart type detection
 */
export function TimeSeriesChart({
  title,
  seriesName,
  category,
  limit = 30,
  orderDirection = 'asc',
  timeRange,
  aggregation = 'none',
  height = 300,
  lineColor = '#3B82F6', // Default blue color
  backgroundColor = 'rgba(59, 130, 246, 0.2)', // Light blue bg
  yAxisLabel,
  xAxisLabel,
  chartType,
  allowChartTypeSwitch = false,
  enableExport = false,
  enableRealtime = false,
  realtimeInterval = 30000,
  className,
}: TimeSeriesChartProps) {
  // State for dynamic chart type
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(chartType || 'line');

  /*
   * Using state for detected chart types, but only needed when allowing type switches
   * Need to set this when allowChartTypeSwitch is true, otherwise not used
   */
  const [, /* detectedChartTypes */ setDetectedChartTypes] = useState<
    Array<{ type: ChartType; confidence: number; reason: string }>
  >([]);

  // Use the time series data hook
  /* detectedChartTypes not used */
  const { data, loading, error, refetch } = useTimeSeriesData({
    seriesName,
    category,
    limit,
    orderDirection,
    timeRange,
    aggregation,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Set up realtime updates if enabled
  useEffect(() => {
    if (!enableRealtime || !realtimeInterval) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      refetch().catch(console.error);
    }, realtimeInterval);

    return () => clearInterval(intervalId);
  }, [enableRealtime, realtimeInterval, refetch]);

  // Auto-detect best chart types based on data
  useEffect(() => {
    if (!data || data.length === 0 || chartType) {
      return;
    }

    const suggestions = detectChartType(data);
    setDetectedChartTypes(suggestions);

    // Auto-select the highest confidence chart type if not manually set
    if (!chartType && suggestions.length > 0) {
      setSelectedChartType(suggestions[0].type);
    }
  }, [data, chartType]);

  // Handle dark mode detection
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    function handleMutations(mutations: MutationRecord[]) {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      }
    }

    const observer = new MutationObserver(handleMutations);
    observer.observe(document.documentElement, { attributes: true });

    return function cleanup() {
      observer.disconnect();
    };
  }, []);

  // Get theme colors from CSS variables to ensure theme consistency
  const getThemeColor = (varName: string): string => {
    if (typeof document !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    return isDarkMode ? '#FFFFFF' : '#000000';
  };

  // Theme-aware chart colors
  const chartColors = {
    grid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    text: getThemeColor('--bolt-elements-textPrimary'),
    textSecondary: getThemeColor('--bolt-elements-textSecondary'),
    background: getThemeColor('--bolt-elements-bg-depth-1'),
  }; // Prepare chart data with proper typing for each chart type
  const getLineChartData = () => {
    const labels = data.map((point) => point.label || point.timestamp.toLocaleString());
    const values = data.map((point) => point.value);

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: lineColor,
          backgroundColor,
          fill: selectedChartType === 'area', // Only fill for area charts
          tension: 0.4,
          pointRadius: selectedChartType === 'area' ? 2 : 3,
          borderWidth: selectedChartType === 'area' ? 1 : 2,
        },
      ],
    };
  };

  const getBarChartData = () => {
    const labels = data.map((point) => point.label || point.timestamp.toLocaleString());
    const values = data.map((point) => point.value);

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: lineColor,
          backgroundColor,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  };

  const getPieChartData = () => {
    const labels = data.map((point) => point.label || point.timestamp.toLocaleString());
    const values = data.map((point) => point.value);

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          backgroundColor: labels.map((_, i) => `hsla(${(i * 25) % 360}, 70%, 60%, 0.8)`),
          borderColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
        },
      ],
    };
  };

  const getScatterChartData = () => {
    return {
      datasets: [
        {
          label: title,
          data: data.map((point) => ({
            x: point.timestamp.getTime(),
            y: point.value,
          })),
          borderColor: lineColor,
          backgroundColor,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const getRadarChartData = () => {
    const labels = data.map((point) => point.label || point.timestamp.toLocaleString());
    const values = data.map((point) => point.value);

    return {
      labels,
      datasets: [
        {
          label: title,
          data: values,
          borderColor: lineColor,
          backgroundColor,
          fill: true,
        },
      ],
    };
  };

  const getBubbleChartData = () => {
    return {
      datasets: [
        {
          label: title,
          data: data.map((point) => ({
            x: point.timestamp.getTime(),
            y: point.value,
            r: Math.max(3, Math.min(15, point.value / 10)), // Bubble size based on value
          })),
          borderColor: lineColor,
          backgroundColor,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: chartColors.text,
    animation: {
      duration: 1000,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: chartColors.text,
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          padding: 16,
          usePointStyle: true,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        titleColor: chartColors.text,
        bodyColor: chartColors.text,
        backgroundColor: isDarkMode ? 'rgba(23, 23, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        borderColor: chartColors.grid,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: chartColors.grid,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: chartColors.text,
          font: {
            weight: 500,
          },
        },
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel || '',
          color: chartColors.textSecondary,
        },
      },
      y: {
        grid: {
          color: chartColors.grid,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: chartColors.text,
          font: {
            weight: 500,
          },
        },
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel || '',
          color: chartColors.textSecondary,
        },
        beginAtZero: true,
      },
    },
  };

  // Function to export data as CSV
  const exportToCsv = () => {
    setIsExporting(true);

    try {
      if (!data || data.length === 0) {
        return;
      }

      // Format data as CSV
      const headers = ['Timestamp', 'Value', 'Category'];
      const csvRows = [headers.join(',')];

      data.forEach((point) => {
        const row = [point.timestamp.toISOString(), point.value, point.category || ''];
        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');

      // Create a download link and trigger it
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute('download', `${seriesName}-${title}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);

      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{ height }}
        className={classNames(
          'flex items-center justify-center bg-bolt-elements-bg-depth-1 rounded-lg border border-bolt-elements-borderColor',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="i-ph-chart-line animate-pulse w-8 h-8 text-bolt-elements-textSecondary" />
          <span className="text-sm text-bolt-elements-textSecondary">Loading data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className={classNames(
          'flex items-center justify-center bg-bolt-elements-bg-depth-1 rounded-lg border border-bolt-elements-borderColor',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="i-ph-warning-circle w-8 h-8 text-red-500" />
          <span className="text-sm text-red-500">Failed to load chart data</span>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className={classNames(
          'flex items-center justify-center bg-bolt-elements-bg-depth-1 rounded-lg border border-bolt-elements-borderColor',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="i-ph-chart-line w-8 h-8 text-bolt-elements-textSecondary" />
          <span className="text-sm text-bolt-elements-textSecondary">No data available</span>
        </div>
      </div>
    );
  } // Render the appropriate chart component based on the selected chart type

  const renderChart = () => {
    switch (selectedChartType) {
      case 'bar':
        return <Bar data={getBarChartData()} options={chartOptions} />;
      case 'pie':
        return <Pie data={getPieChartData()} options={{ ...chartOptions, aspectRatio: 1 }} />;
      case 'scatter':
        return <Scatter data={getScatterChartData()} options={chartOptions} />;
      case 'radar':
        return <Radar data={getRadarChartData()} options={chartOptions} />;
      case 'bubble':
        return <Bubble data={getBubbleChartData()} options={chartOptions} />;
      case 'area':
        // Area chart is a line chart with fill=true
        return <Line data={getLineChartData()} options={chartOptions} />;
      default:
        return <Line data={getLineChartData()} options={chartOptions} />;
    }
  };

  return (
    <div
      style={{ height }}
      className={classNames(
        'p-4 bg-bolt-elements-bg-depth-1 rounded-lg border border-bolt-elements-borderColor',
        className,
      )}
    >
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary">{title}</h3>

        <div className="flex items-center space-x-2">
          {/* Chart type selector */}
          {allowChartTypeSwitch && (
            <select
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
              className="text-xs bg-transparent border border-bolt-elements-borderColor rounded px-2 py-1 text-bolt-elements-textSecondary"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
              <option value="scatter">Scatter</option>
              <option value="area">Area</option>
              <option value="radar">Radar</option>
            </select>
          )}

          {/* Export button */}
          {enableExport && (
            <button
              onClick={exportToCsv}
              disabled={isExporting || loading || data.length === 0}
              className={classNames(
                'text-xs flex items-center px-2 py-1 rounded',
                'bg-bolt-elements-bg-depth-2 text-bolt-elements-textSecondary',
                'hover:bg-bolt-elements-bg-depth-3 border border-bolt-elements-borderColor',
                isExporting || loading || data.length === 0 ? 'opacity-50 cursor-not-allowed' : '',
              )}
            >
              {isExporting ? (
                <>
                  <div className="i-ph-spinner-gap-bold animate-spin w-3 h-3 mr-1" />
                  <span>Exporting</span>
                </>
              ) : (
                <>
                  <div className="i-ph-download-simple w-3 h-3 mr-1" />
                  <span>CSV</span>
                </>
              )}
            </button>
          )}

          {/* Realtime indicator */}
          {enableRealtime && (
            <div className="flex items-center text-xs text-bolt-elements-textSecondary">
              <div
                className={classNames(
                  'w-2 h-2 rounded-full mr-1',
                  loading ? 'bg-amber-500' : 'bg-green-500 animate-pulse',
                )}
              />
              {loading ? 'Updating...' : 'Live'}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 'calc(100% - 2.5rem)' }}>{renderChart()}</div>
    </div>
  );
}
