'use client';

import { cn, getRiskColor, getRiskBgColor } from '@/lib/utils';

interface RiskBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({ score, showLabel = true, size = 'md' }: RiskBadgeProps) {
  const level = score > 0.7 ? 'Critical' : score > 0.4 ? 'Medium' : 'Low';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      getRiskBgColor(score),
      getRiskColor(score),
      sizeClasses[size]
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        score > 0.7 ? 'bg-red-500 critical-pulse' : score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
      )} />
      {showLabel && <span>{level}</span>}
      <span className="opacity-75">({(score * 100).toFixed(0)}%)</span>
    </span>
  );
}
