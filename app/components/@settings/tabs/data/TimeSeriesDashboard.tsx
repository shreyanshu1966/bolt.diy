import React, { useState } from 'react';
import { TimeSeriesChart } from '~/components/ui/TimeSeriesChart';
import { Button } from '~/components/ui/Button';
import { useManagedSupabase } from '~/lib/hooks/useManagedSupabase';

export function TimeSeriesDashboard() {
  const { supabase, isConnected } = useManagedSupabase();
  const [generatingData, setGeneratingData] = useState(false);

  // Function to generate some example data
  const generateExampleData = async () => {
    if (!supabase || !isConnected) {
      return;
    }

    setGeneratingData(true);

    try {
      // Generate 30 days of data
      const now = new Date();
      const dataPoints = [];

      // Revenue data
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);

        // Generate random revenue between 500 and 5000
        const revenue = Math.floor(Math.random() * 4500) + 500;

        dataPoints.push({
          series_name: 'revenue',
          category: 'sales',
          timestamp: date.toISOString(),
          numeric_value: revenue,
          created_at: new Date().toISOString(),
          user_id: 'system',
        });
      }

      // Users data
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);

        // Generate random user growth - increase over time
        const users = Math.floor(100 + (30 - i) * 10 + Math.random() * 50);

        dataPoints.push({
          series_name: 'users',
          category: 'growth',
          timestamp: date.toISOString(),
          numeric_value: users,
          created_at: new Date().toISOString(),
          user_id: 'system',
        });
      }

      // Temperature data
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);

        // Generate temperatures that oscillate between 60 and 85
        const temperature = Math.floor(72.5 + Math.sin(i / 3) * 12.5);

        dataPoints.push({
          series_name: 'temperature',
          category: 'weather',
          timestamp: date.toISOString(),
          numeric_value: temperature,
          created_at: new Date().toISOString(),
          user_id: 'system',
        });
      }

      // Insert the data in batches
      const batchSize = 50;

      for (let i = 0; i < dataPoints.length; i += batchSize) {
        const batch = dataPoints.slice(i, i + batchSize);
        await supabase.from('time_series_data').insert(batch);
      }
    } catch (error) {
      console.error('Error generating example data:', error);
    } finally {
      setGeneratingData(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">Time Series Analytics</h2>
        <Button
          onClick={generateExampleData}
          disabled={generatingData || !isConnected}
          className="flex items-center"
          size="sm"
        >
          {generatingData ? (
            <>
              <div className="i-ph-spinner-gap-bold animate-spin w-4 h-4 mr-2" />
              Generating Data...
            </>
          ) : (
            <>
              <div className="i-ph-chart-line-up w-4 h-4 mr-2" />
              Generate Example Data
            </>
          )}
        </Button>
      </div>{' '}
      {/* Sample / Demo Charts */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-bolt-elements-textPrimary">Sample Data Visualizations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TimeSeriesChart
            title="Revenue Over Time"
            seriesName="revenue"
            category="sales"
            height={300}
            yAxisLabel="Revenue ($)"
            xAxisLabel="Date"
            lineColor="#3ECF8E"
            backgroundColor="rgba(62, 207, 142, 0.2)"
            chartType="area"
            enableExport={true}
            enableRealtime={true}
          />

          <TimeSeriesChart
            title="User Growth"
            seriesName="users"
            category="growth"
            height={300}
            yAxisLabel="Total Users"
            xAxisLabel="Date"
            lineColor="#6366F1"
            backgroundColor="rgba(99, 102, 241, 0.2)"
            allowChartTypeSwitch={true}
            enableExport={true}
          />
        </div>

        <div className="mt-6">
          <TimeSeriesChart
            title="Temperature Variations"
            seriesName="temperature"
            category="weather"
            height={300}
            aggregation="none"
            yAxisLabel="Temperature (°F)"
            xAxisLabel="Date"
            lineColor="#F59E0B"
            backgroundColor="rgba(245, 158, 11, 0.2)"
            allowChartTypeSwitch={true}
            enableExport={true}
          />
        </div>
      </div>
      {/* Application Analytics */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4 text-bolt-elements-textPrimary">Application Analytics</h3>
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Real-time analytics data collected from your application usage. Events are automatically tracked and stored in
          the time series database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TimeSeriesChart
            title="System Events"
            seriesName="analytics"
            category="system"
            height={300}
            yAxisLabel="Event Count"
            xAxisLabel="Time"
            lineColor="#8B5CF6"
            backgroundColor="rgba(139, 92, 246, 0.2)"
            allowChartTypeSwitch={true}
            enableRealtime={true}
            realtimeInterval={15000}
          />

          <TimeSeriesChart
            title="User Interactions"
            seriesName="analytics"
            category="interaction"
            height={300}
            yAxisLabel="Event Count"
            xAxisLabel="Time"
            lineColor="#EC4899"
            backgroundColor="rgba(236, 72, 153, 0.2)"
            chartType="bar"
            enableRealtime={true}
            realtimeInterval={15000}
          />
        </div>
      </div>
    </div>
  );
}
