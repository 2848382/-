import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="flex items-center justify-between mb-6 px-1">
      <div className="space-y-1">
        <h3 className="text-heading text-[var(--color-primary-900)]">{title}</h3>
        {subtitle && (
          <p className="text-micro text-[var(--color-neutral-500)] tracking-widest">{subtitle}</p>
        )}
      </div>
      {action && (
        <button 
          onClick={action.onClick} 
          className="flex items-center gap-1.5 text-micro font-black text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)] transition-colors py-2 px-3 rounded-xl hover:bg-[var(--color-primary-50)]"
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
};
