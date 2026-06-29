import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUserProfile } from '../hooks/useUserProfile';
import { Lock, Fingerprint, Activity, User, BookOpen, Heart, Flame, Shield, MapPin, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGame } from '../contexts/GameContext'; // just for loading state if needed.

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnboarding?: boolean;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, isOnboarding = false }) => {
  const { profile, canEditStats, statsEditCount, updateProfileData } = useUserProfile();
  
  const [formData, setFormData] = useState({
    dormRoom: '',
    bio: '',
    academicAchievement: 50,
    bonding: 50,
    rebellion: 50,
    physical: 50,
    stress: 0
  });

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        dormRoom: profile.dormRoom || '',
        bio: profile.bio || profile.characteristics || '', // fallback to characteristics if bio is empty
        academicAchievement: profile.academicAchievement ?? 50,
        bonding: profile.bonding ?? 50,
        rebellion: profile.rebellion ?? 50,
        physical: profile.physical ?? 50,
        stress: profile.stress ?? 0
      });
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const remainingEdits = Math.max(0, 3 - statsEditCount);
  const isDanger = remainingEdits === 1;

  const currentTotal = formData.academicAchievement + formData.bonding + formData.rebellion + formData.physical;
  const remainingPoints = 200 - currentTotal;
  const isOverPoint = remainingPoints < 0;
  const isValidTotal = remainingPoints === 0;

  const handleSubmit = async () => {
    if (!canEditStats || !isValidTotal) return;
    setSaving(true);
    const success = await updateProfileData({
      dormRoom: formData.dormRoom,
      bio: formData.bio,
      academicAchievement: formData.academicAchievement,
      bonding: formData.bonding,
      rebellion: formData.rebellion,
      physical: formData.physical,
      stress: formData.stress
    }, isOnboarding);
    setSaving(false);
    
    if (success) {
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        if (isOnboarding) {
           onClose();
        } else if (!canEditStats || remainingEdits - 1 === 0) {
           // We might want to keep it open or close it
        }
      }, 1000);
    } else {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "수정 중 오류가 발생했습니다.", type: "error" } }));
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-200/80 backdrop-blur-sm flex justify-center items-center p-4 font-sans select-none overflow-y-auto mix-blend-normal">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
           "w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden relative border",
           canEditStats ? "border-[#0F172A]" : "border-slate-300 bg-slate-50"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-8 border-b relative overflow-hidden",
          canEditStats ? "bg-[#0F172A] text-white" : "bg-slate-200 text-slate-500"
        )}>
           {!canEditStats && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                <Lock size={120} />
              </div>
           )}
           <div className="relative z-10 flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                  <Fingerprint size={28} />
                  {isOnboarding ? '신규 프로필 설정' : '프로필 수정'}
               </h2>
               <p className={cn("text-sm mt-2 font-bold", canEditStats ? "text-sky-300" : "text-slate-600")}>
                  명원고등학교 ID: {profile.studentId}
               </p>
             </div>
             
             {/* Edit Count Badge */}
             {!isOnboarding && (
               <motion.div 
                 animate={justSaved ? { scale: [1, 1.2, 1], color: ['#fff', '#ef4444', '#fff'] } : {}}
                 className={cn(
                   "flex flex-col items-end text-right p-3 rounded-xl",
                   isDanger ? "bg-rose-500 text-white animate-pulse" : "bg-white/10"
                 )}
               >
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">잔여 수정 횟수</span>
                  <span className="text-2xl font-black tracking-tighter">
                    {remainingEdits} / 3
                  </span>
               </motion.div>
             )}
           </div>
        </div>

        <div className="p-8 space-y-8 relative">
           {!canEditStats && (
              <div className="absolute inset-0 z-50 bg-slate-100/30 flex items-center justify-center pointer-events-none">
                 {statsEditCount >= 3 && (
                   <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-slate-200 text-center flex flex-col items-center">
                     <Lock className="text-rose-500 mb-4" size={40} />
                     <h3 className="text-lg font-black text-[#0F172A] mb-2 uppercase tracking-wide">수정 한도 초과</h3>
                     <p className="text-sm text-slate-500 font-bold">더 이상 정보를 수정할 수 없습니다.<br/>행정실에 문의하세요.</p>
                   </div>
                 )}
              </div>
           )}

           {/* Personal Info fields */}
           <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                 <label className="text-xs font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
                   <MapPin size={14} className="text-sky-500"/> 기숙사 호실
                 </label>
                 <input 
                   disabled={!canEditStats}
                   value={formData.dormRoom}
                   onChange={e => setFormData({...formData, dormRoom: e.target.value})}
                   placeholder="예: 304호"
                   className={cn(
                     "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all",
                     !canEditStats && "opacity-50 cursor-not-allowed bg-slate-100"
                   )}
                 />
              </div>
           </div>
           
           <div className="space-y-2">
              <label className="text-xs font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-sky-500"/> 한 줄 소개 (상태 메시지)
              </label>
              <input 
                disabled={!canEditStats}
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="본인을 표현하는 짧은 문장을 적어 주세요."
                className={cn(
                  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all",
                  !canEditStats && "opacity-50 cursor-not-allowed bg-slate-100"
                )}
              />
           </div>

           <div className="h-px bg-slate-200 w-full my-8" />

           {/* Stats section */}
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <h3 className="text-lg font-black text-[#0F172A] uppercase tracking-widest">스테이터스 분배</h3>
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-black tracking-widest inline-flex items-center gap-2",
                  isOverPoint 
                    ? "bg-rose-100 text-rose-600 animate-pulse" 
                    : isValidTotal 
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-[#0F172A] text-sky-300"
                )}>
                   잔여 포인트: {remainingPoints} / 200
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {[
                  { key: 'academicAchievement', label: '학업/지능', icon: BookOpen, color: 'sky', editable: true },
                  { key: 'bonding', label: '유대감', icon: Heart, color: 'pink', editable: true },
                  { key: 'rebellion', label: '반항심', icon: Flame, color: 'rose', editable: true },
                  { key: 'physical', label: '체력/근력', icon: Shield, color: 'emerald', editable: true },
                  { key: 'stress', label: '스트레스 (디버프)', icon: Activity, color: 'purple', editable: false },
                ].map(stat => (
                  <div key={stat.key} className="flex items-center gap-6">
                     <div className="w-32 flex items-center gap-2">
                       <stat.icon size={16} className={`text-${stat.color}-500`} />
                       <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{stat.label}</span>
                     </div>
                     <input 
                       disabled={!canEditStats || !stat.editable}
                       type="range"
                       min="0" max="100"
                       value={(formData as any)[stat.key]}
                       onChange={e => {
                         if (stat.editable) {
                           setFormData({...formData, [stat.key]: parseInt(e.target.value)})
                         }
                       }}
                       className={cn(
                         "flex-1 h-2 rounded-full appearance-none bg-slate-200",
                         (canEditStats && stat.editable) ? `accent-${stat.color}-500 cursor-pointer` : "accent-slate-400 cursor-not-allowed opacity-50"
                       )}
                     />
                     <div className="w-12 text-right font-mono font-black text-lg text-[#0F172A]">
                       {(formData as any)[stat.key]}
                     </div>
                  </div>
                ))}
              </div>
           </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 relative z-10">
           {!isOnboarding && (
             <button 
               onClick={onClose}
               className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
             >
               닫기
             </button>
           )}
           {canEditStats && (
             <button 
               onClick={handleSubmit}
               disabled={saving || !isValidTotal}
               className={cn(
                 "px-8 py-3 rounded-xl font-black text-white uppercase tracking-widest shadow-xl transition-all flex items-center gap-2",
                 (saving || !isValidTotal) 
                   ? "bg-slate-400 cursor-not-allowed" 
                   : "bg-[#0F172A] shadow-[#0F172A]/20 hover:scale-[1.02] active:scale-95"
               )}
             >
               {saving ? '저장 중......' : '프로필 적용'}
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
};
