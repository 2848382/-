import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IsoMapArea, ALL_MAP_AREAS } from '../../constants/mapData';
import { RoomStatus } from './IsoRoom';
import { UserProfile } from '../../types';
import { Cctv, ShieldAlert, ShoppingCart, Coffee, AlertTriangle, X, BoxSelect, MapPin, Lock, CheckCircle } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';
import { useGame } from '../../contexts/GameContext';
import { cn } from '../../lib/utils';
import { getRoomAvailability } from '../../lib/spacialAvailability';

interface MapDetailPanelProps {
  area: IsoMapArea | null;
  roomStatus?: RoomStatus;
  currentLoop: number;
  allPlayers: UserProfile[];
  clueNodes: any[];
  masterView?: boolean;
  onCheckIn: (id: string) => void;
  onOpenStore: (type: 'store' | 'vending', id: string) => void;
  onClose: () => void;
}

export const MapDetailPanel: React.FC<MapDetailPanelProps> = ({
  area, roomStatus, currentLoop, allPlayers, clueNodes, masterView, onCheckIn, onOpenStore, onClose
}) => {
  // [체크인] GameContext에서 가져오기
  const { checkIn, canCheckInToday, lastCheckInLocation, profile } = useGame();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<'success' | 'error' | null>(null);

  const handleCheckIn = async () => {
    if (!area || !canCheckInToday) return;
    setIsCheckingIn(true);
    try {
      await checkIn(area.id);
      setCheckInResult('success');
      setTimeout(() => setCheckInResult(null), 3000);
    } catch (e: any) {
      setCheckInResult('error');
      setTimeout(() => setCheckInResult(null), 3000);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleStateChange = async (newState: string) => {
    if (!area) return;
    try {
      await updateDoc(doc(db, 'room_status', area.id), {
        state: newState,
        updatedAt: serverTimestamp()
      });
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `room_status/${area.id}`);
    }
  };

  // Close when pressing outside or esc (handled outside, but here we provide onClose for the X button and outside click)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const presentPlayers = React.useMemo(() => {
    if (!area || !roomStatus?.presentPlayers) return [];
    return roomStatus.presentPlayers
      .map(uid => allPlayers.find(p => p.uid === uid))
      .filter(Boolean) as UserProfile[];
  }, [area, roomStatus, allPlayers]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!area ? (
          <motion.div
            key="empty-desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hidden xl:flex w-full xl:w-[30%] bg-[var(--color-surface)] relative overflow-hidden flex-col border-l border-[var(--color-border)] z-30"
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-[var(--color-blue-50)] border border-[var(--color-blue-100)] flex items-center justify-center mb-5"
              >
                <BoxSelect size={28} className="text-[var(--color-blue-400)]" />
              </motion.div>
              <h3 className="text-[var(--color-text-primary)] font-black tracking-tight text-base mb-2">
                구역을 선택해주세요
              </h3>
              <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
                지도에서 구역을 클릭하면<br />
                상세 정보와 체크인이 가능합니다
              </p>
              {lastCheckInLocation && (
                <div className="mt-5 px-4 py-2.5 bg-[var(--color-blue-50)] border border-[var(--color-blue-100)] rounded-xl flex items-center gap-2 text-[var(--color-blue-600)] text-xs font-bold">
                  <MapPin size={12} />
                  오늘 체크인: {ALL_MAP_AREAS.find(a => a.id === lastCheckInLocation)?.name ?? '알 수 없음'}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="content-desktop"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="hidden xl:flex w-full xl:w-[30%] bg-[var(--color-surface)] relative overflow-x-hidden overflow-y-auto flex-col border-l border-[var(--color-border)] z-30"
          >
            <PanelContent 
              area={area} roomStatus={roomStatus} currentLoop={currentLoop} presentPlayers={presentPlayers}
              masterView={masterView} onClose={onClose} handleStateChange={handleStateChange}
              onOpenStore={onOpenStore} checkInResult={checkInResult} handleCheckIn={handleCheckIn}
              canCheckInToday={canCheckInToday} lastCheckInLocation={lastCheckInLocation} isCheckingIn={isCheckingIn}
              isDesktop={true} profile={profile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {area && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {area && (
          <motion.div
            key="panel-mobile"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="xl:hidden fixed left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[1.5rem] shadow-2xl border-t border-[var(--color-border)] flex flex-col"
            style={{
              height: '78vh',
              bottom: 0
            }}
          >
            {/* 하단 여백 채움: 드래그 시 위로 뜰 경우 대비한 bg 연장선 */}
            <div className="absolute top-full left-0 right-0 h-[50vh] bg-[var(--color-surface)]" />

            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0 cursor-grab active:cursor-grabbing" />
            
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <PanelContent 
                area={area} roomStatus={roomStatus} currentLoop={currentLoop} presentPlayers={presentPlayers}
                masterView={masterView} onClose={onClose} handleStateChange={handleStateChange}
                onOpenStore={onOpenStore} checkInResult={checkInResult} handleCheckIn={handleCheckIn}
                canCheckInToday={canCheckInToday} lastCheckInLocation={lastCheckInLocation} isCheckingIn={isCheckingIn}
                isDesktop={false} profile={profile}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


const PanelContent = ({ 
  area, roomStatus, currentLoop, presentPlayers, masterView, onClose, handleStateChange, onOpenStore, checkInResult, handleCheckIn, canCheckInToday, lastCheckInLocation, isCheckingIn, isDesktop, profile
}: any) => {
  const availability = React.useMemo(() => {
    return getRoomAvailability(area, profile, presentPlayers.length);
  }, [area, profile, presentPlayers.length]);

  return (
    <div 
      className="flex flex-col p-5 md:p-6 flex-1 overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch', paddingBottom: !isDesktop ? 'calc(env(safe-area-inset-bottom) + 2rem)' : '2rem' }}
    >
      <div className="mb-6 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-sub)] text-[var(--color-text-secondary)] text-[10px] font-bold tracking-widest border border-[var(--color-border)]">
              {area.building} · {area.floor}
            </span>
            {(!availability.isAvailable && !area.id.includes('hidden')) && (
               <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100 flex items-center gap-1">
                 <AlertTriangle size={10} /> {availability.reason || '접근 불가'}
               </span>
            )}
            {availability.maxCapacity < 100 && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 flex items-center gap-1">
                MAX: {availability.maxCapacity}명
              </span>
            )}
            {area.id.includes('hidden') && (
              <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-500 text-[10px] font-bold border border-red-100 flex items-center gap-1">
                <ShieldAlert size={10} /> CLASSIFIED
              </span>
            )}
            {currentLoop >= 3 && (
              <span className="px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-slate-200 rounded-lg">
                <Cctv size={10} /> REC
              </span>
            )}
          </div>
          {/* [신규] 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-200)] text-[var(--color-text-secondary)] transition-all active:scale-90 shrink-0"
            aria-label="닫기"
          >
            <X size={15} />
          </button>
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
          {area.name}
        </h2>
        <div className="flex flex-wrap gap-1 mt-3 mb-1">
          {area.features.map((f: string) => (
            <span key={f} className="text-[10px] bg-white border border-[var(--color-border)] shadow-sm text-[var(--color-text-muted)] px-2 py-0.5 rounded-md font-bold">
              #{f}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] my-5" />

      {/* 상태 */}
      <div className="mb-5">
        <div className="text-xs font-bold text-[var(--color-text-muted)] mb-3 tracking-wider uppercase">상태</div>
        <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-sub)] rounded-xl border border-[var(--color-border)]">
          <div className={cn(
            "w-2 h-2 rounded-full shrink-0",
            area.status.includes('위험') || roomStatus?.state === 'danger' ? "bg-red-500 animate-pulse" :
            area.status.includes('잠김') ? "bg-slate-400" :
            "bg-emerald-500"
          )} />
          <span className={cn(
            "text-sm font-bold",
            area.status.includes('위험') || roomStatus?.state === 'danger' ? "text-red-600" :
            area.status.includes('잠김') ? "text-slate-500" :
            "text-[var(--color-text-primary)]"
          )}>
            {roomStatus?.state === 'danger' ? '위험 구역 (수동설정)' : area.status}
          </span>
        </div>
        {roomStatus?.note && masterView && (
          <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
            마스터 메모: {roomStatus.note}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] my-5" />

      {/* 설명 */}
      <div className="mb-5">
          <div className="text-xs font-bold text-[var(--color-text-muted)] mb-2 tracking-wider uppercase">설명</div>
          <p className="text-sm md:text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed">
            {area.description}
          </p>
      </div>

      <div className="border-t border-[var(--color-border)] my-5" />

      {/* 접속자 */}
      <div className="mb-5">
          <div className="text-xs font-bold text-[var(--color-text-muted)] mb-3 tracking-wider uppercase flex gap-1 items-center">
              현재 위치 ({presentPlayers.length})
          </div>
          {presentPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                  {presentPlayers.map((p: any) => (
                      <div key={p.uid} className="flex items-center gap-1.5 bg-[var(--color-surface-sub)] rounded-lg pr-2 py-1 border border-[var(--color-border)]">
                          <div className="w-5 h-5 rounded-md overflow-hidden bg-white shadow-sm ml-1">
                              {p.photoURL && <img src={p.photoURL} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">{p.name}</span>
                      </div>
                  ))}
              </div>
          ) : (
              <span className="text-xs text-[var(--color-text-muted)] font-medium">아무도 없습니다.</span>
          )}
      </div>

      {/* [C] 이번 루프 동선 히스토리 (마스터 전용) */}
      {masterView && profile?.checkInHistory && (
        <div className="mb-5">
          <div className="text-xs font-bold text-[var(--color-text-muted)] mb-2 tracking-wider uppercase">
            이번 루프 동선
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {profile.checkInHistory
              .filter(h => h.loopIndex === (profile.loops ?? 0))
              .slice(-5)
              .reverse()
              .map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-navy-300)] shrink-0" />
                  <span className="text-[var(--color-text-secondary)] font-medium">{h.locationName}</span>
                  <span className="text-[var(--color-text-muted)] ml-auto">
                    {new Date(h.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {masterView && (
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 shadow-inner mb-5">
              <div className="text-[10px] tracking-wider uppercase font-black text-slate-500 mb-2">마스터 컨트롤</div>
              <select 
                value={roomStatus?.state || 'normal'}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                  <option value="normal">Normal (기본)</option>
                  <option value="locked">Locked (잠금)</option>
                  <option value="danger">Danger (위험)</option>
                  <option value="event">Event (이벤트)</option>
                  <option value="hidden">Hidden (숨김)</option>
              </select>
          </div>
      )}

      {/* 체크인 섹션 (매점/자판기 버튼 위) */}
      <div className="mb-6">
        {area.id.includes('hidden') || roomStatus?.state === 'locked' || !availability.isAvailable ? (
          <div className="w-full py-3.5 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center gap-1 text-red-500 font-bold text-sm">
            <div className="flex items-center gap-2">
              <Lock size={16} />
              {(!availability.isAvailable && availability.reason) ? availability.reason : '접근 제한 구역입니다'}
            </div>
            {availability.maxCapacity < 100 && (
              <span className="text-[10px] opacity-70">수용 인원: {availability.maxCapacity}명 (현재: {presentPlayers.length}명)</span>
            )}
          </div>
        ) : (
          <>
            {/* 오늘 이미 이 장소에 체크인한 경우 */}
            {lastCheckInLocation === area.id ? (
              <button disabled className="w-full py-3.5 bg-[var(--color-blue-50)] border border-[var(--color-blue-200)] text-[var(--color-blue-400)] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm opacity-80">
                <MapPin size={16} />
                오늘 이 곳에 체크인함
                <span className="text-xs text-[var(--color-blue-300)] font-normal ml-1">+50 원 획득완료</span>
              </button>
            ) : !canCheckInToday ? (
              // 오늘 다른 장소에 체크인한 경우
              <button disabled className="w-full py-3.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm opacity-80">
                <Lock size={16} />
                오늘 체크인 완료 — 내일 다시 가능
              </button>
            ) : (
              // 체크인 가능
              <AnimatePresence mode="wait">
                {checkInResult === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm"
                  >
                    <CheckCircle size={16} />
                    체크인 완료! +50 원
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 bg-[var(--color-blue-900)] hover:bg-[var(--color-blue-800)] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
                  >
                    {isCheckingIn ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <MapPin size={16} />
                    )}
                    이 곳에 체크인
                    <span className="text-xs text-white/60 font-normal">+50 원</span>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </div>

      {/* 기타 버튼 (매점, 자판기) */}
      <div className="flex flex-col gap-2.5 my-2">
        {area.hasStore && (
          <button
            onClick={() => onOpenStore('store', area.id)}
            className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm active:scale-[0.98]"
            >
            <ShoppingCart size={16} /> 매점 열기
            </button>
        )}
        
        {area.hasVending && (
          <button
              onClick={() => onOpenStore('vending', area.id)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]"
            >
              <Coffee size={16} /> 자판기 열기
            </button>
        )}
        
        {area.minLoop && currentLoop < area.minLoop && (
            <div className="text-center text-xs text-red-500 font-bold flex items-center justify-center gap-1.5 mt-2 bg-red-50/50 py-2 rounded-lg">
              <AlertTriangle size={14} /> {area.minLoop}루프부터 접근 가능
            </div>
        )}
      </div>
    </div>
  );
};
