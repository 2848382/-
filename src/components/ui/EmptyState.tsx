import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 mw-card-sub border-dashed">
      <div className="p-4 bg-white rounded-full text-[var(--color-neutral-300)] shadow-sm">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-subhead text-[var(--color-primary-900)]">{title}</h4>
        {description && (
          <p className="text-body text-[var(--color-neutral-400)] max-w-[240px]">{description}</p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="mw-btn-ghost mt-2">
          {action.label}
        </button>
      )}
    </div>
  );
};
