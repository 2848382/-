import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { Radio, Activity, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const EVPRadio: React.FC = () => {
  const { systemConfig } = useGame();
  const reduced = useReducedMotion();
  const [targetFreq, setTargetFreq] = useState<number>(88.1); // from db
  const [currentFreq, setCurrentFreq] = useState<number>(87.5);
  const [isMatching, setIsMatching] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (systemConfig?.radioFrequency) {
      setTargetFreq(systemConfig.radioFrequency);
    }
  }, [systemConfig]);

  useEffect(() => {
    // Dummy audio setup
    audioRef.current = new Audio('https://s3.amazonaws.com/freecodecamp/simonSound1.mp3');
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const diff = Math.abs(currentFreq - targetFreq);

  useEffect(() => {
    if (diff < 0.2) {
       setIsMatching(true);
       if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
       }
    } else {
       setIsMatching(false);
       if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
       }
    }
  }, [diff]);

  const handleDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    
    const percentage = x / rect.width;
    const range = 108.0 - 87.5;
    const val = 87.5 + (percentage * range);
    setCurrentFreq(Number(val.toFixed(1)));
  };

  const handlePointerDown = (e: any) => {
    handleDrag(e);
    
    const onMove = (moveEvent: Event) => handleDrag(moveEvent as any);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  // [SVG] 파형 바 배열 생성 (32개 바)
  const BAR_COUNT = 32;
  const bars = useMemo(() => {
     return Array.from({ length: BAR_COUNT }, (_, i) => {
       const base = Math.sin((i / BAR_COUNT) * Math.PI * 2) * 0.5 + 0.5;
       const noise = diff > 2 ? (Math.random() * 0.8) : (Math.random() * 0.2);
       const matchBonus = diff < 0.5 ? Math.sin((i / BAR_COUNT) * Math.PI * 4) * 0.4 : 0;
       return Math.max(0.05, Math.min(1, base * 0.4 + noise + matchBonus));
     });
  }, [diff]);

  const barColor = diff > 5 ? '#4b5563'
    : diff > 2 ? '#eab308'
    : diff > 0.5 ? '#f97316'
    : '#ef4444';

  return (
    <div className="flex flex-col h-full bg-[#1A1A1A] text-[#E0E0E0] p-6 rounded-[2rem] overflow-hidden relative shadow-2xl border-4 border-[#333] font-mono">
      {/* Grill texture background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
      
      {/* Antenna lines */}
      <div className="absolute top-4 right-6 text-[#555]">
         <Radio size={32} />
      </div>

      <div className="z-10 mt-4 mb-10">
         <h2 className="text-xl font-black tracking-[0.2em] uppercase text-[#888]">EVP Receiver</h2>
         <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest mt-1">
            Freq. Modulation System
         </p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center z-10 w-full space-y-8">
         {/* Digital Display */}
         <div className={cn(
           "bg-[#0a0a0a] border-4 p-8 w-full max-w-sm rounded-xl text-center shadow-inner transition-colors duration-500",
           isMatching ? "border-rose-900 shadow-[0_0_30px_rgba(159,18,57,0.3)] inset" : "border-[#222]"
         )}>
            <div className="flex justify-between items-center mb-4 text-[#555] text-[10px] font-black uppercase">
               <span>FM</span>
               <div className="flex items-center gap-1">
                 <Volume2 size={12} className={isMatching ? "text-rose-500 animate-pulse" : ""} />
                 <span>TUNE</span>
               </div>
            </div>
            
            <div className={cn(
              "text-7xl font-black tracking-tighter transition-colors",
              isMatching ? "text-rose-600 drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]" : "text-[#444]"
            )} style={{ fontFamily: 'monospace' }}>
               {currentFreq.toFixed(1)}
            </div>
            
            {isMatching && (
              <div className="mt-4 flex items-center justify-center gap-2 text-rose-500 text-xs font-bold animate-pulse">
                <Activity size={16} /> SIGNAL LOCKED
              </div>
            )}
         </div>

         {/* [SVG] 오디오 파형 렌더링 */}
         <div className="w-full max-w-md px-4">
            <svg viewBox={`0 0 ${BAR_COUNT * 6} 40`} className="w-full h-10 my-4">
              {bars.map((h, i) => (
                <motion.rect
                  key={i}
                  x={i * 6 + 1}
                  y={20 - h * 18}
                  width={4}
                  height={h * 36}
                  rx={2}
                  fill={barColor}
                  opacity={diff < 0.5 ? 0.9 : 0.5}
                  animate={reduced ? {} : {
                    height: [h * 36, h * 36 * (0.7 + Math.random() * 0.6), h * 36],
                    y: [20 - h * 18, 20 - h * 18 * (0.7 + Math.random() * 0.6), 20 - h * 18],
                  }}
                  transition={{
                    duration: diff < 0.5 ? 0.3 : diff < 2 ? 0.5 : 0.8,
                    repeat: Infinity,
                    delay: i * 0.02,
                    ease: 'easeInOut',
                  }}
                />
              ))}
              {diff < 0.5 && (
                <defs>
                  <filter id="radio-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              )}
            </svg>
         </div>

         {/* Analog Dial Slider */}
         <div className="w-full max-w-md px-4">
            <div className="w-full bg-[#222] h-16 rounded-lg relative cursor-ew-resize overflow-hidden border-2 border-[#111]"
                 ref={sliderRef}
                 onMouseDown={handlePointerDown}
                 onTouchStart={handlePointerDown}
            >
               {/* Freq marks */}
               <div className="absolute inset-0 flex items-end justify-between px-2 pb-1 opacity-20 pointer-events-none">
                 {Array.from({length: 20}).map((_, i) => (
                    <div key={i} className={cn("w-0.5 bg-white", i % 5 === 0 ? "h-6" : "h-3")} />
                 ))}
               </div>
               
               {/* Indicator Needle */}
               <div 
                 className="absolute top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.8)] pointer-events-none"
                 style={{ left: `${((currentFreq - 87.5) / (108.0 - 87.5)) * 100}%`, transform: 'translateX(-50%)' }}
               />
            </div>
            
            <div className="flex justify-between mt-2 text-[#555] text-xs font-bold font-mono">
               <span>87.5</span>
               <span>108.0</span>
            </div>
         </div>
      </div>
    </div>
  );
};
