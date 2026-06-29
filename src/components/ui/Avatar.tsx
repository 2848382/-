import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // 24/32/40/56/80px
  className?: string;
  loopLevel?: number; // 5 이상이면 글리치 클래스 적용
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  loopLevel = 1,
}) => {
  const [error, setError] = useState(false);

  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-14 h-14 text-[18px]',
    xl: 'w-20 h-20 text-[24px]',
  };

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const isGlitchy = (loopLevel || 1) >= 5;

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-[var(--color-neutral-100)] flex items-center justify-center font-bold text-[var(--color-neutral-500)] border border-[var(--color-border)] shrink-0 shadow-sm transition-all",
        sizeMap[size],
        isGlitchy && `progressive-glitch-${Math.min(9, loopLevel || 5)}`,
        className
      )}
    >
      {src && !error ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="selection-none">{initials || '?'}</span>
      )}
      
      {isGlitchy && (
        <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none" />
      )}
    </div>
  );
};
