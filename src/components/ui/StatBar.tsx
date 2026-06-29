import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: 'academic' | 'physical' | 'bonding' | 'rebellion' | 'stress' | 'stamina' | 'neutral';
  icon?: React.ReactNode;
  masked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animate?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  max = 100,
  color,
  icon,
  masked = false,
  size = 'md',
  showValue = true,
  animate = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorMap = {
    academic: 'bg-[var(--color-stat-academic)]',
    physical: 'bg-[var(--color-stat-physical)]',
    bonding: 'bg-[var(--color-stat-bonding)]',
    rebellion: 'bg-[var(--color-stat-rebellion)]',
    stress: 'bg-[var(--color-stat-stress)]',
    stamina: 'bg-[var(--color-stat-stamina)]',
    neutral: 'bg-[var(--color-neutral-400)]',
  };

  const barHeight = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full space-y-1.5" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-[var(--color-neutral-500)]">{icon}</span>}
          <span className="text-micro text-[var(--color-neutral-500)]">{label}</span>
        </div>
        {showValue && (
          <span className={cn("text-micro font-black", masked ? "blur-[2px]" : "")}>
            {masked ? '??' : Math.round(value)}
            <span className="text-[var(--color-neutral-300)] font-medium ml-0.5">/ {max}</span>
          </span>
        )}
      </div>
      <div className={cn("w-full bg-[var(--color-neutral-100)] rounded-full overflow-hidden", barHeight[size])}>
        {animate ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className={cn("h-full rounded-full transition-all duration-300", colorMap[color])}
          />
        ) : (
          <div
            className={cn("h-full rounded-full transition-all duration-300", colorMap[color])}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
};
