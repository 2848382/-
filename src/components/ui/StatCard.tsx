import React from 'react';
import { cn } from '../../lib/utils';
import { StatBar } from './StatBar';

interface StatCardProps {
  label: string;
  value: number;
  color: 'academic' | 'physical' | 'bonding' | 'rebellion' | 'stress' | 'stamina' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  masked?: boolean;
  delta?: number; // positive = ▲, negative = ▼
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  color,
  icon,
  description,
  masked = false,
  delta,
  onClick,
}) => {
  const getIconColor = () => {
    switch (color) {
      case 'academic': return 'text-[var(--color-stat-academic)] bg-[var(--color-stat-academic)]/10';
      case 'physical': return 'text-[var(--color-stat-physical)] bg-[var(--color-stat-physical)]/10';
      case 'bonding': return 'text-[var(--color-stat-bonding)] bg-[var(--color-stat-bonding)]/10';
      case 'rebellion': return 'text-[var(--color-stat-rebellion)] bg-[var(--color-stat-rebellion)]/10';
      case 'stress': return 'text-[var(--color-stat-stress)] bg-[var(--color-stat-stress)]/10';
      case 'stamina': return 'text-[var(--color-stat-stamina)] bg-[var(--color-stat-stamina)]/10';
      default: return 'text-[var(--color-neutral-500)] bg-[var(--color-neutral-100)]';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "mw-card p-5 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
      )}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", getIconColor())}>
          {icon}
        </div>
        {delta !== undefined && delta !== 0 && (
          <div className={cn(
            "text-micro px-1.5 py-0.5 rounded flex items-center gap-0.5",
            delta > 0 ? "text-[var(--color-success)] bg-[var(--color-success)]/10" : "text-[var(--color-danger)] bg-[var(--color-danger)]/10"
          )}>
            {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
          </div>
        )}
      </div>
      
      <div className="space-y-1 mb-4">
        <div className="flex items-baseline justify-between">
          <h4 className="text-micro text-[var(--color-neutral-500)]">{label}</h4>
          <span className={cn("text-heading", masked && "blur-[3px]")}>
            {masked ? '??' : Math.round(value)}
          </span>
        </div>
        {description && (
          <p className="text-micro text-[var(--color-neutral-400)] leading-tight">{description}</p>
        )}
      </div>

      <StatBar label="" value={value} color={color} size="sm" showValue={false} masked={masked} />
    </div>
  );
};
