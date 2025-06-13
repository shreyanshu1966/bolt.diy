import type { ChartData, ChartOptions } from 'chart.js';
import type { TimeSeriesDataPoint } from '~/lib/hooks/useTimeSeriesData';

export interface ChartConfiguration {
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar';
  labels?: string[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  displayLegend?: boolean;
  theme?: 'light' | 'dark';
  shouldFill?: boolean;
}

/**
 * Formats time series data for use with Chart.js
 */
export function formatTimeSeriesForChart(
  timeSeriesData: TimeSeriesDataPoint[],
  config: ChartConfiguration,
): ChartData<any> {
  // Default colors if not provided
  const defaultColors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
  ];

  const colors = config.colors || defaultColors;

  // Get unique categories for grouping data
  const categories = timeSeriesData
    .map((point) => point.category || 'default')
    .filter((value, index, self) => self.indexOf(value) === index);

  const labels = config.labels || timeSeriesData.map((point) => point.label || point.timestamp.toString());

  if (config.chartType === 'pie' || config.chartType === 'doughnut') {
    // For pie/doughnut charts, aggregate data by category
    return {
      labels: categories,
      datasets: [
        {
          data: categories.map((category) =>
            timeSeriesData
              .filter((point) => (point.category || 'default') === category)
              .reduce((sum, point) => sum + point.value, 0),
          ),
          backgroundColor: colors.slice(0, categories.length),
          borderWidth: 1,
        },
      ],
    };
  }

  // For time series charts (line, bar)
  const datasets = categories.map((category, index) => {
    const color = colors[index % colors.length];
    const filteredData = timeSeriesData.filter((point) => (point.category || 'default') === category);

    return {
      label: category,
      data: filteredData.map((point) => point.value),
      backgroundColor: config.shouldFill ? color : color.replace('0.8', '0.2'),
      borderColor: color,
      borderWidth: 2,
      fill: config.shouldFill,
      tension: 0.4, // Smooth lines for line charts
      pointRadius: 3,
    };
  });

  return {
    labels,
    datasets,
  };
}

/**
 * Generates Chart.js options based on chart configuration
 */
export function generateChartOptions(config: ChartConfiguration): ChartOptions<any> {
  const isDark = config.theme === 'dark';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  // Default options for all chart types
  const baseOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: config.displayLegend ?? true,
        position: 'top',
        labels: {
          color: textColor,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
        bodyColor: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        borderColor: gridColor,
        borderWidth: 1,
      },
      title: {
        display: !!config.title,
        text: config.title || '',
        color: textColor,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
    },
  };

  // For circular charts (pie, doughnut), return simplified options
  if (config.chartType === 'pie' || config.chartType === 'doughnut') {
    return baseOptions;
  }

  // Add scales options for cartesian charts
  return {
    ...baseOptions,
    scales: {
      x: {
        display: true,
        title: {
          display: !!config.xAxisLabel,
          text: config.xAxisLabel || '',
          color: textColor,
        },
        grid: {
          display: true,
          color: gridColor,
        },
        ticks: {
          color: textColor,
        },
      },
      y: {
        display: true,
        title: {
          display: !!config.yAxisLabel,
          text: config.yAxisLabel || '',
          color: textColor,
        },
        grid: {
          display: true,
          color: gridColor,
        },
        ticks: {
          color: textColor,

          // Add a callback to format large numbers
          callback(value: any) {
            if (typeof value !== 'number') {
              return value;
            }

            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            } else {
              return value;
            }
          },
        },
        beginAtZero: true,
      },
    },
  };
}

/**
 * Helper function to generate dummy time series data for testing
 */
export function generateDummyTimeSeriesData(
  days: number = 30,
  categories: string[] = ['Series A'],
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
): TimeSeriesDataPoint[] {
  const data: TimeSeriesDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    for (const category of categories) {
      const value = Math.floor(Math.random() * 100) + 10;
      data.push({
        timestamp: date,
        value,
        category,
        label: date.toLocaleDateString(),
      });
    }
  }

  return data;
}
