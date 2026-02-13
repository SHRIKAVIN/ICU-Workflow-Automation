'use client';

import React, { memo } from 'react';
import { cn, getRiskColor } from '@/lib/utils';
import { Heart, Wind, Thermometer, Activity } from 'lucide-react';

interface LiveVitalsCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: 'heart' | 'oxygen' | 'temperature' | 'activity';
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

const icons = {
  heart: Heart,
  oxygen: Wind,
  temperature: Thermometer,
  activity: Activity,
};

const statusColors = {
  normal: 'from-green-400 to-emerald-500',
  warning: 'from-yellow-400 to-orange-500',
  critical: 'from-red-400 to-rose-500',
};

const statusBg = {
  normal: 'bg-green-50 dark:bg-green-900/10',
  warning: 'bg-yellow-50 dark:bg-yellow-900/10',
  critical: 'bg-red-50 dark:bg-red-900/10',
};

function LiveVitalsCard({ label, value, unit, icon, status = 'normal', trend }: LiveVitalsCardProps) {
  const Icon = icons[icon];

  return (
    <div className={cn('glass-card p-4 relative overflow-hidden', status === 'critical' && 'critical-pulse')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
          </div>
        </div>
        <div className={cn('p-2.5 rounded-xl', statusBg[status])}>
          <Icon className={cn('w-5 h-5', status === 'critical' ? 'text-red-500' : status === 'warning' ? 'text-yellow-500' : 'text-green-500')} />
        </div>
      </div>
      {/* Decorative gradient bar */}
      <div className={cn('absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r', statusColors[status])} />
    </div>
  );
}

export default memo(LiveVitalsCard);
