import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'loop';
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  dot = false,
  pulse = false,
}) => {
  const variantStyles = {
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
    neutral: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]',
    loop: 'bg-[var(--color-primary-900)] text-white shadow-sm',
  };

  const dotStyles = {
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]',
    neutral: 'bg-[var(--color-neutral-400)]',
    loop: 'bg-white',
  };

  return (
    <span className={cn("mw-badge", variantStyles[variant])}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full mr-1", 
          dotStyles[variant],
          pulse && "animate-pulse"
        )} />
      )}
      {children}
    </span>
  );
};
