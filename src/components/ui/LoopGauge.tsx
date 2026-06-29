import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LoopGaugeProps {
  currentLoop: number;
  maxLoop?: number;
  hasAwakened: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LoopGauge: React.FC<LoopGaugeProps> = ({ currentLoop, maxLoop = 10, hasAwakened, size = 'md' }) => {
  const reduced = useReducedMotion();
  const pxSize = size === 'sm' ? 60 : size === 'lg' ? 140 : 100;
  const RADIUS = 42;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = Math.min(1, currentLoop / maxLoop);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const gaugeColor = currentLoop >= 8 ? '#ef4444'
    : currentLoop >= 5 ? '#f97316'
    : currentLoop >= 3 ? '#eab308'
    : '#3b5bdb';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={pxSize} height={pxSize} viewBox="0 0 100 100">
        <defs>
          <filter id="loop-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={50} cy={50} r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
        />
        <motion.circle
          cx={50} cy={50} r={RADIUS}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          transform="rotate(-90 50 50)"
          style={{ filter: currentLoop >= 5 ? `url(#loop-glow)` : 'none' }}
        />
        {currentLoop >= 5 && (
          <circle cx={50} cy={10} r={3} fill={gaugeColor} className={!reduced ? "loop-warning-dot" : ""}>
             {reduced && <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />}
          </circle>
        )}
        <text
          x={50} y={46}
          textAnchor="middle"
          fontSize={14}
          fontWeight={900}
          fill="white"
        >
          {currentLoop}
        </text>
        <text
          x={50} y={60}
          textAnchor="middle"
          fontSize={8}
          fontWeight={700}
          fill="rgba(255,255,255,0.4)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {hasAwakened ? 'LOOP' : '학기'}
        </text>
      </svg>
    </div>
  );
};
