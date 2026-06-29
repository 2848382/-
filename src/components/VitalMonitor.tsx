import React, { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { Heart, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { LoopGauge } from './ui/LoopGauge';

export const VitalMonitor: React.FC = () => {
  const { profile } = useGame();
  const reduced = useReducedMotion();

  if (!profile) return null;

  const stress = profile.stress || 0;
  const isCritical = stress >= 80;
  const stressColor = isCritical ? 'text-rose-500' : stress >= 60 ? 'text-orange-500' : 'text-emerald-500';
  
  // [SVG] 심전도 파형 생성 함수
  const generateECGPath = (stressVal: number, width: number, height: number): string => {
    const midY = height / 2;
    const amplitude = 10 + (stressVal / 100) * 25; 
    const segments: string[] = [];
    const cycleWidth = width / 3;

    for (let i = 0; i < 3; i++) {
       const x = i * cycleWidth;
       segments.push(`M ${x} ${midY}`);
       segments.push(`Q ${x + cycleWidth * 0.1} ${midY - amplitude * 0.3} ${x + cycleWidth * 0.2} ${midY}`);
       segments.push(`L ${x + cycleWidth * 0.3} ${midY}`);
       segments.push(`L ${x + cycleWidth * 0.35} ${midY - amplitude * 1.5}`);  
       segments.push(`L ${x + cycleWidth * 0.4} ${midY + amplitude * 0.5}`);   
       segments.push(`L ${x + cycleWidth * 0.45} ${midY}`);
       segments.push(`Q ${x + cycleWidth * 0.6} ${midY - amplitude * 0.4} ${x + cycleWidth * 0.7} ${midY}`);
       segments.push(`L ${x + cycleWidth} ${midY}`);

       if (stressVal >= 80 && Math.random() > 0.6) {
          const noiseX = x + cycleWidth * (0.8 + Math.random() * 0.15);
          const noiseY = midY + (Math.random() - 0.5) * amplitude * 0.8;
          segments.push(`M ${noiseX} ${midY} L ${noiseX} ${noiseY} L ${noiseX + 4} ${midY}`);
       }
    }
    return segments.join(' ');
  };

  const cycleSpeed = stress >= 80 ? 0.6 : stress >= 60 ? 0.9 : stress >= 31 ? 1.2 : 1.5;
  const svgWidth = 600;
  
  const currentPath = useMemo(() => {
     if (stress === 100) return `M 0 40 L ${svgWidth} 40`;
     return generateECGPath(stress, svgWidth, 80);
  }, [stress]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#0F172A] rounded-[2rem] p-10 overflow-hidden relative shadow-2xl">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Decorative pulse glow */}
      {isCritical && (
         <motion.div 
           className="absolute inset-0 bg-rose-500/10 pointer-events-none"
           animate={reduced ? {} : { opacity: [0.1, 0.3, 0.1] }}
           transition={{ duration: 1, repeat: Infinity }}
         />
      )}

      <div className="z-10 w-full max-w-2xl space-y-8">
        <div className="text-center flex flex-col items-center">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">MyeongWon Vital Systems</h2>
           <div className="text-xl font-bold text-white tracking-tight">{profile.name} <span className="text-slate-500 text-sm ml-2">{profile.studentId}</span></div>
        </div>

        {/* [SVG] 메인 파형 - 심박 모니터 */}
        <div className="bg-black/40 rounded-3xl border border-slate-800 p-6 shadow-inner relative overflow-hidden h-32 flex items-center justify-center">
           {stress === 100 && (
             <motion.div 
                className="absolute inset-0 flex items-center justify-center z-10 font-bold text-rose-500 tracking-[0.5em] text-2xl drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                animate={reduced ? {} : { opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
             >
                CRITICAL
             </motion.div>
           )}
           <svg
             viewBox={`0 0 ${svgWidth} 80`}
             className="w-full"
             style={{ overflow: 'visible' }}
             preserveAspectRatio="none"
           >
             {/* 배경 그리드 라인 */}
             {Array.from({ length: 8 }).map((_, i) => (
               <line
                 key={i}
                 x1={0} y1={i * 10}
                 x2={svgWidth} y2={i * 10}
                 stroke="rgba(255,255,255,0.04)"
                 strokeWidth={1}
               />
             ))}

             <defs>
               <filter id="glow-green">
                 <feGaussianBlur stdDeviation="2" result="blur" />
                 <feMerge>
                   <feMergeNode in="blur" />
                   <feMergeNode in="SourceGraphic" />
                 </feMerge>
               </filter>
               <filter id="glow-red">
                 <feGaussianBlur stdDeviation="3" result="blur" />
                 <feMerge>
                   <feMergeNode in="blur" />
                   <feMergeNode in="SourceGraphic" />
                 </feMerge>
               </filter>
             </defs>

             {/* 파형 */}
             <motion.path
               d={currentPath}
               fill="none"
               stroke={stress >= 80 ? '#ef4444' : stress >= 60 ? '#f97316' : '#10b981'}
               strokeWidth={stress === 100 ? 5 : 2}
               strokeLinecap="round"
               filter={stress >= 80 ? 'url(#glow-red)' : 'url(#glow-green)'}
               initial={{ pathLength: 0, opacity: 0 }}
               animate={reduced ? { pathLength: 1, opacity: 1 } : {
                 pathLength: [0, 1],
                 opacity: [0.6, 1, 0.6],
               }}
               transition={{ duration: cycleSpeed, repeat: Infinity, ease: 'linear' }}
               className={!reduced ? "ecg-path" : ""}
             />
           </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
           {/* Heart Rate / Stress */}
           <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                   <Heart size={10} className={stressColor} /> BPM
                 </div>
                 <div className={cn("text-5xl font-black tracking-tighter", stressColor)}>
                   {Math.floor(60 + stress * 1.2)}
                 </div>
              </div>
           </div>

           {/* Stamina */}
           <div className="flex flex-col items-center gap-4 border-t border-slate-800 pt-8 md:border-t-0 md:border-l md:pt-0">
              <div className="text-center">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                   <Activity size={10} className="text-emerald-500" /> STAMINA
                 </div>
                 <div className="text-5xl font-black tracking-tighter text-white">
                   {profile.stamina || 0}<span className="text-xl text-slate-500">%</span>
                 </div>
              </div>
           </div>
           
           {/* Loop Gauge */}
           <div className="flex flex-col items-center gap-2 border-t border-slate-800 pt-8 md:border-t-0 md:border-l md:pt-0">
              <div className="text-center mb-1">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">분석 로그</div>
              </div>
              <LoopGauge currentLoop={profile.loops || 1} hasAwakened={profile.hasAwakened || false} size="sm" />
           </div>
        </div>
      </div>
    </div>
  );
};
