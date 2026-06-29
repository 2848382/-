import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../contexts/GameContext';
import { db } from '../lib/firebase';
import {
  collection, query, where, onSnapshot, orderBy, limit,
  updateDoc, doc
} from 'firebase/firestore';
import {
  Bell, X, Mail, Target, Gift, Clock, Zap,
  BookOpen, Heart, Shield, AlertTriangle,
  ChevronRight, MapPin, Users, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Letter, PrivateMission, RewardRequest } from '../types';
import { ALL_MAP_AREAS } from '../constants/mapData';
import { gameTerms } from '../lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

const STAT_CONFIG = [
  { key: 'academicAchievement', label: '학업', icon: BookOpen, color: '#3b82f6', threshold: null, max: 100 },
  { key: 'physical', label: '피지컬', icon: Shield, color: '#10b981', threshold: 20, max: 100 },
  { key: 'bonding', label: '유대감', icon: Heart, color: '#ec4899', threshold: null, max: 100 },
  { key: 'rebellion', label: '반항심', icon: Zap, color: '#ef4444', threshold: null, max: 100 },
  { key: 'stress', label: '스트레스', icon: AlertTriangle, color: '#f97316', threshold: 80, isHighRisk: true, max: 100 },
  { key: 'stamina', label: '스테미나', icon: TrendingUp, color: '#8b5cf6', threshold: 15, max: 100 },
];

// [UI개선] 공통 아이템 카드 패턴 DrawerItem 추가
const DrawerItem: React.FC<any> = ({ icon, iconBg, title, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all text-left"
    style={{ background: 'rgba(255,255,255,0.05)' }}
  >
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: iconBg }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold truncate" style={{ color: 'white' }}>{title}</div>
      {subtitle && (
        <div className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{subtitle}</div>
      )}
    </div>
    <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
  </button>
);

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user, profile, systemConfig, systemTimer, allStudents, lastCheckInLocation } = useGame();
  
  const [unreadLetters, setUnreadLetters] = useState<Letter[]>([]);
  const [activeMissions, setActiveMissions] = useState<PrivateMission[]>([]);
  const [myRewards, setMyRewards] = useState<RewardRequest[]>([]);
  const [unreadTips, setUnreadTips] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'letters'),
      where('recipientUid', '==', user.uid),
      where('isDelivered', '==', true),
      where('isRead', '==', false),
      orderBy('deliverAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, snap => {
      setUnreadLetters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Letter)));
    }, (error) => console.error("NotificationDrawer Letters Error:", error));
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'private_missions'),
      where('targetUid', '==', user.uid),
      where('isVisible', '==', true),
      where('isCompleted', '==', false),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, snap => {
      setActiveMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateMission)));
    }, (error) => console.error("NotificationDrawer Missions Error:", error));
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'reward_requests'),
      where('requesterId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, snap => {
      setMyRewards(snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardRequest)));
    }, (error) => console.error("NotificationDrawer Rewards Error:", error));
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'anonymous_tips'),
      where('recipientUid', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsubscribe = onSnapshot(q, snap => {
      setUnreadTips(snap.docs.length);
    }, (error) => console.error("NotificationDrawer Tips Error:", error));
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!systemTimer.active || !systemTimer.endTime) {
      setCountdown('');
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, systemTimer.endTime! - Date.now());
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [systemTimer]);

  const unreadCount = unreadLetters.length + unreadTips + activeMissions.length;
  const currentLoop = Math.max(profile?.loops || 0, systemConfig?.currentLoop || 0);
  const termLabel = gameTerms('loop', profile?.hasAwakened || false);
  const isHighDanger = currentLoop >= 6;

  const handleLetterClick = async (letter: Letter) => {
    await updateDoc(doc(db, 'letters', letter.id), { isRead: true });
    onNavigate('letters');
  };

  const checkedInArea = lastCheckInLocation
    ? ALL_MAP_AREAS.find(a => a.id === lastCheckInLocation)
    : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[490]"
            /* [UI개선] 드로어 뒤 오버레이 강화 */
            style={{ 
              background: 'rgba(0,0,0,0.55)', 
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.3, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -60 || info.velocity.y < -400) onClose();
            }}
            className="fixed top-0 left-0 right-0 z-[500] flex flex-col"
            /* [UI개선] 드로어 배경 blur 강화 */
            style={{
              height: '82vh',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              background: 'rgba(100, 116, 139, 0.18)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '0 0 1.5rem 1.5rem',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Section 1: Handle + Header */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={16} style={{ color: 'white' }} />
                <span className="text-sm font-black text-white tracking-tight">e-알리미</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{ background: 'rgba(239,68,68,0.9)' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Scroll Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}>

              {/* Section 2: Stats Mini Dashboard */}
              <SectionCard title="현재 상태" icon={<TrendingUp size={13} />}>
                <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1">
                  {STAT_CONFIG.map(stat => {
                    const value = Math.max(0, profile?.[stat.key as keyof typeof profile] as number || 0);
                    const isDanger = stat.threshold !== null && (stat.isHighRisk ? value >= stat.threshold : value <= stat.threshold);
                    return (
                      <div 
                        key={stat.key} 
                        className={cn(
                          "shrink-0 w-[72px] h-[90px] rounded-xl flex flex-col items-center justify-center gap-1.5 snap-center transition-all",
                          isDanger ? "border-red-500/30 bg-red-500/10" : "border-white/5 bg-white/5"
                        )}
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <stat.icon size={16} style={{ color: isDanger ? '#ef4444' : stat.color }} />
                        <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{stat.label}</span>
                        <span className={cn("text-xs font-black", isDanger ? "text-red-400" : "text-white")}>{value}</span>
                        <div className="w-10 h-0.5 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ 
                              width: `${(Math.min(100, Math.max(0, value)) / stat.max) * 100}%`,
                              backgroundColor: stat.color
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Section 3: Timer + Loop */}
              <SectionCard title={`${termLabel} 현황`} icon={<Clock size={13} />}>
                {/* [UI개선] 3 재학 기간 레이아웃 개선 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      현재 {termLabel}
                    </span>
                    <span className={cn("text-xl font-black", isHighDanger ? "text-red-400 animate-pulse" : "text-white")} style={{ letterSpacing: '-0.04em' }}>
                      {currentLoop} {gameTerms('loopCount', profile?.hasAwakened || false)}
                    </span>
                  </div>
                  {/* 타이머는 오른쪽에 */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {systemTimer.active ? '남은 시간' : 'SYSTEM TIMER'}
                    </span>
                    <span className="text-base font-black font-mono"
                      style={{ color: systemTimer.active ? (isHighDanger ? '#ef4444' : '#10b981') : 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                      {countdown || '- - : - -'}
                    </span>
                  </div>
                </div>
              </SectionCard>

              {/* Section 4: Letters */}
              {unreadLetters.length > 0 && (
                <SectionCard
                  title="새로운 편지"
                  icon={<Mail size={13} />}
                  badge={unreadLetters.length}
                  onAction={() => onNavigate('letters')}
                >
                  <div className="space-y-2">
                    {unreadLetters.map(letter => {
                      const sender = allStudents.find(s => s.uid === letter.senderUid)?.name || '익명';
                      return (
                        <DrawerItem
                          key={letter.id}
                          icon={<Mail size={18} style={{ color: '#3b82f6' }} />}
                          iconBg="rgba(59, 130, 246, 0.15)"
                          title={`From: ${sender}`}
                          subtitle={letter.content}
                          onClick={() => handleLetterClick(letter)}
                        />
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {/* Section 5: Private Missions */}
              {activeMissions.length > 0 && (
                <SectionCard
                  title="진행 중인 특별 과제"
                  icon={<Target size={13} />}
                  badge={activeMissions.length}
                  onAction={() => onNavigate('missions')}
                >
                  <div className="space-y-2">
                    {activeMissions.map(mission => (
                      <DrawerItem
                          key={mission.id}
                          icon={<Target size={18} style={{ color: '#ef4444' }} />}
                          iconBg="rgba(239, 68, 68, 0.15)"
                          title={mission.title}
                          subtitle={mission.description}
                          onClick={() => onNavigate('missions')}
                      />
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Section 6: Reward Requests */}
              <SectionCard
                title="보상 신청 현황"
                icon={<Gift size={13} />}
                onAction={() => onNavigate('rewards')}
              >
                <div className="space-y-2">
                  {myRewards.length === 0 ? (
                    <p className="text-[10px] text-center py-2" style={{ color: 'rgba(255,255,255,0.4)' }}>최근 신청 내역이 없습니다.</p>
                  ) : (
                    myRewards.map(req => (
                      <DrawerItem
                          key={req.id}
                          icon={<Gift size={18} style={{ color: '#ec4899' }} />}
                          iconBg="rgba(236, 72, 153, 0.15)"
                          title={req.itemName || req.reason}
                          subtitle={`${new Date(req.createdAt?.toMillis?.()).toLocaleDateString()} - [${req.status.toUpperCase()}]`}
                          onClick={() => onNavigate('rewards')}
                      />
                    ))
                  )}
                </div>
              </SectionCard>

              {/* Section 7: Check-In */}
              <SectionCard
                title="오늘의 체크인"
                icon={<MapPin size={13} />}
                onAction={() => onNavigate('map')}
              >
                {checkedInArea ? (
                  <DrawerItem
                      icon={<MapPin size={18} style={{ color: '#10b981' }} />}
                      iconBg="rgba(16, 185, 129, 0.15)"
                      title={checkedInArea.name}
                      subtitle="오늘의 방문 완료 ✓ (+50 원)"
                      onClick={() => onNavigate('map')}
                  />
                ) : (
                  <DrawerItem
                      icon={<MapPin size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                      iconBg="rgba(255,255,255,0.05)"
                      title="아직 체크인하지 않았습니다."
                      subtitle="탭하여 이동하기"
                      onClick={() => onNavigate('map')}
                  />
                )}
              </SectionCard>

              {/* Section 8: Anonymous Tips */}
              {unreadTips > 0 && (
                <SectionCard
                  title="익명 제보함"
                  icon={<Users size={13} />}
                  badge={unreadTips}
                  onAction={() => onNavigate('tips')}
                >
                  <DrawerItem
                      icon={<AlertTriangle size={18} style={{ color: '#f59e0b' }} />}
                      iconBg="rgba(245, 158, 11, 0.15)"
                      title={`익명 제보 ${unreadTips}건 도착`}
                      subtitle="제보함에서 내용을 확인하세요."
                      onClick={() => onNavigate('tips')}
                  />
                </SectionCard>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  badge?: number;
  onAction?: () => void;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, badge, onAction, children }) => (
  <div
    className="rounded-2xl p-4 transition-all duration-300"
    style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}
  >
    <div className="flex items-center justify-between mb-3 shrink-0">
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'rgba(255,255,255,0.6)' }}>
          {title}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black text-white"
            style={{ background: 'rgba(239,68,68,0.85)' }}>
            {badge}
          </span>
        )}
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-0.5 text-[10px] font-bold hover:opacity-80 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          더보기 <ChevronRight size={10} />
        </button>
      )}
    </div>
    <div>{children}</div>
  </div>
);
