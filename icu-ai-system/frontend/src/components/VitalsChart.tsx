'use client';

import React, { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatTime } from '@/lib/utils';

interface VitalsData {
  timestamp: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  bloodPressureSystolic?: number;
  respiratoryRate?: number;
}

interface VitalsChartProps {
  data: VitalsData[];
  metric: 'heartRate' | 'spo2' | 'temperature' | 'bloodPressureSystolic' | 'respiratoryRate';
  title: string;
  unit: string;
  color: string;
  dangerHigh?: number;
  dangerLow?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{formatTime(label)}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.value?.toFixed(1)} {entry.unit || ''}
        </p>
      ))}
    </div>
  );
};

function VitalsChart({ data, metric, title, unit, color, dangerHigh, dangerLow }: VitalsChartProps) {
  const chartData = data.map(d => ({
    time: d.timestamp,
    value: d[metric],
    label: formatTime(d.timestamp),
  }));

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {dangerHigh && (
              <Line
                type="monotone"
                dataKey={() => dangerHigh}
                stroke="#EF4444"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name="Danger High"
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
              dot={false}
              activeDot={{ r: 4, fill: color }}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(VitalsChart);
