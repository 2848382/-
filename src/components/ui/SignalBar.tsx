import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SignalBarProps {
  status: 'connected' | 'connecting' | 'offline';
  loop: number;
}

export const SignalBar: React.FC<SignalBarProps> = ({ status, loop }) => {
  const reduced = useReducedMotion();
  const bars = [1, 2, 3, 4];
  
  const filledBars = status === 'offline' ? 0
    : status === 'connecting' ? 1
    : loop >= 8 ? 2
    : loop >= 5 ? 3
    : 4;

  return (
    <svg width={20} height={16} viewBox="0 0 20 16" className="inline-block relative z-50">
      {status === 'offline' ? (
        <>
          <line x1={2} y1={2} x2={18} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
          <line x1={18} y1={2} x2={2} y2={14} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        bars.map((bar, i) => {
          const isFilled = i < filledBars;
          const shouldBlink = isFilled && loop >= 5 && i >= filledBars - 1;
          const color = isFilled ? (loop >= 8 ? '#ef4444' : loop >= 5 ? '#f97316' : 'currentColor') : 'rgba(150,150,150,0.3)';
          
          return (
            <motion.rect
              key={bar}
              x={i * 5}
              y={16 - bar * 3.5}
              width={3}
              height={bar * 3.5}
              rx={1}
              fill={color}
              animate={shouldBlink && !reduced ? { opacity: [1, 0.2, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              className={!reduced && status === 'connected' && loop >= 8 ? "signal-unstable" : ""}
            />
          );
        })
      )}
    </svg>
  );
};
