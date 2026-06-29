import React, { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { Activity, BookOpen, Shield, Heart, Flame } from 'lucide-react';
import { StatBar } from './ui/StatBar';
import { BottomSheet } from './ui/BottomSheet';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const DashboardStatus: React.FC = () => {
  const { profile } = useGame();
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  if (!profile) return null;

  const isMasked = profile.isStatsMasked;
  // [UI개선] 스트레스 및 모든 수치 음수 클램핑
  const stress = Math.max(0, profile.stress || 0);
  const isHighStress = stress >= 80 && !isMasked;

  const STATS = useMemo(() => [
    { 
      key: 'academic', 
      label: '학업 스탯', 
      value: Math.max(0, profile.academicAchievement || 0), 
      icon: <BookOpen size={20} />, 
      color: 'academic' as const, 
      desc: '지능과 지식. 암호 해독이나 단서 분석 능력.' 
    },
    { 
      key: 'physical', 
      label: '피지컬', 
      value: Math.max(0, profile.physical || 0), 
      icon: <Shield size={20} />, 
      color: 'physical' as const, 
      desc: '체력과 순발력. 위기 탈출 및 야간 행동 능력.' 
    },
    { 
      key: 'bonding', 
      label: '유대감', 
      value: Math.max(0, profile.bonding || 0), 
      icon: <Heart size={20} />, 
      color: 'bonding' as const, 
      desc: '대인 관계. 협동 액션 및 비밀 정보 공유 효율.' 
    },
    { 
      key: 'rebellion', 
      label: '반항심', 
      value: Math.max(0, profile.rebellion || 0), 
      icon: <Flame size={20} />, 
      color: 'rebellion' as const, 
      desc: '규칙 위반 성향. 금지 구역 진입 및 일탈 성공률.' 
    },
  ], [profile.academicAchievement, profile.physical, profile.bonding, profile.rebellion]);

  const selectedStatData = useMemo(() => {
    if (selectedStat === 'stress') return {
      label: '스트레스',
      desc: '공포와 압박. 수치가 높을수록 시각적 노이즈가 심해지며 락다운 위험 증가.'
    };
    return STATS.find(s => s.key === selectedStat);
  }, [selectedStat, STATS]);

  return (
    <div className="space-y-6">
      {/* 1. Stress Bar (Top) */}
      <div 
        className="mw-card p-6 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedStat('stress')}
      >
        <StatBar 
          label="스트레스 수치" 
          value={stress} 
          color={isHighStress ? 'rebellion' : 'stress'} 
          icon={<Activity size={16} />}
          masked={isMasked}
          size="lg"
        />
        {isHighStress && (
          <p className="mt-2 text-micro text-[var(--color-danger)] animate-pulse">
            ⚠️ 경고: 극심한 정신적 압박 상태입니다.
          </p>
        )}
      </div>

      {/* 2. 4 Stats (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-4">
        {STATS.map(stat => (
          <div 
            key={stat.key}
            onClick={() => setSelectedStat(stat.key)}
            className="mw-card cursor-pointer hover:shadow-md active:scale-95 transition-all"
          >
            {/* [UI개선] 스탯 카드 내부 레이아웃 교체 (세로 배치) */}
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  `bg-[var(--color-stat-${stat.color})]/10 text-[var(--color-stat-${stat.color})]`
                )}>
                  {stat.icon}
                </div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  {stat.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
                  {isMasked ? "???" : stat.value}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-medium">/ 100</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden mt-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `var(--color-stat-${stat.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: isMasked ? "0%" : `${Math.min(100, Math.max(0, stat.value))}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* [UI-4] 설명 오버레이: BottomSheet */}
      <BottomSheet 
        isOpen={!!selectedStat} 
        onClose={() => setSelectedStat(null)}
        title={selectedStatData?.label}
      >
        <div className="space-y-6">
          <p className="text-subhead text-[var(--color-neutral-700)] leading-relaxed">
            {selectedStatData?.desc}
          </p>
          <button 
            onClick={() => setSelectedStat(null)}
            className="w-full mw-btn-primary py-4"
          >
            확인
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
