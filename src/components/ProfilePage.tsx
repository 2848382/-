import React, { useState, useRef } from 'react';
import { StudentCard } from './StudentCard';
import { ProfileEditModal } from './ProfileEditModal';
import { Settings, Share2, Download, X } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { StatHistoryChart } from './StatHistoryChart';
import * as htmlToImage from 'html-to-image';
import { cn } from '../lib/utils';
import { useToast } from '../contexts/ToastContext';

export const ProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { statsEditCount, canEditStats } = useUserProfile();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedImage, setExportedImage] = useState<string | null>(null);

  const handleShare = async () => {
     if (!cardRef.current) return;
     setIsExporting(true);
     try {
        const dataUrl = await htmlToImage.toPng(cardRef.current, { backgroundColor: '#E2E8F0', pixelRatio: 2 });
        setExportedImage(dataUrl);
     } catch(e) {
        console.error("Export failed", e);
        showToast("이미지 생성에 실패했습니다.", "error");
     } finally {
        setIsExporting(false);
     }
  };

  return (
    <div className="space-y-6 relative pb-10">
      
      <div className="flex justify-end mt-4 px-2">
         {/* [UI개선] SNS 공유 버튼 스타일 변경 */}
         <button 
            onClick={handleShare}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[var(--color-neutral-100)] border border-[var(--color-border)] font-bold text-[var(--color-text-secondary)] px-4 py-2 rounded-xl text-xs hover:bg-[var(--color-neutral-200)] active:scale-[0.97] transition-all disabled:opacity-50"
         >
            {isExporting ? <Download size={13} className="animate-bounce" /> : <Share2 size={13} />}
            SNS에 공유
         </button>
      </div>

      <div ref={cardRef} className="p-4 bg-slate-50 rounded-2xl mx-auto flex justify-center border border-slate-200 shadow-sm relative overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
         <StudentCard />
      </div>

      <StatHistoryChart />

      {/* [UI개선] 상태창 버튼 스타일 조건부 적용 */}
      <button 
        onClick={() => setIsEditModalOpen(true)}
        className={cn(
          "w-full bg-white p-6 rounded-2xl border transition-all flex items-center justify-between group",
          canEditStats
            ? "border-[#E2E8F0] shadow-sm hover:shadow-md"
            : "border-[var(--color-border)] bg-[var(--color-surface-sub)] cursor-not-allowed opacity-70"
        )}
      >
         <div className="flex flex-col text-left">
           <span className="text-sm font-black text-[#0F172A] tracking-tight flex items-center gap-2">
              <Settings size={16} className="text-sky-500" />
              프로필/스테이터스 수정
           </span>
           <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {canEditStats
                ? `남은 수정 횟수: ${3 - (statsEditCount || 0)} / 3회`
                : '이번 학기 수정 횟수를 모두 사용했습니다'}
           </span>
         </div>
         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0F172A] group-hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
         </div>
      </button>

      <div className="bg-transparent p-6 text-center text-[10px] font-black text-[#0F172A]/30 tracking-widest uppercase">
        MYEONGWON IDENTITY PROTOCOL VERIFIED
      </div>

      <ProfileEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />

      {/* Exported Image Modal */}
      {exportedImage && (
         <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExportedImage(null)}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center" onClick={e => e.stopPropagation()}>
               <div className="w-full flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-800">이미지 저장</h3>
                 <button onClick={() => setExportedImage(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={16}/></button>
               </div>
               <p className="text-sm text-slate-500 mb-6 text-center">아래 이미지를 <strong className="text-indigo-600">길게 눌러서 저장</strong>하거나 캡쳐해주세요.</p>
               <img src={exportedImage} alt="Student Card Export" className="w-full rounded-xl shadow-lg border border-slate-200" />
               <button 
                 onClick={() => {
                   const link = document.createElement('a');
                   link.download = 'myeongwon-student-id.png';
                   link.href = exportedImage;
                   link.click();
                 }}
                 className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md"
               >
                 직접 다운로드 시도
               </button>
            </div>
         </div>
      )}
    </div>
  );
};

