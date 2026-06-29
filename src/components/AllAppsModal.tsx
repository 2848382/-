import React from 'react';
import { motion } from 'motion/react';
import { Star, FileText, Smartphone, Archive, ShoppingCart, Map, Users, Radio, Scan, Gift, Network, History, Target, MessageCircle, FileHeart, Lock } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { cn } from '../lib/utils';

export const ALL_APPS = [
  { id: 'board', name: '명원 대나무숲', icon: FileText, desc: '학생 커뮤니티' },
  { id: 'terminal', name: '원 단말기', icon: Smartphone, desc: '메시지 & 포인트 설정' },
  { id: 'archive', name: '사물함', icon: Archive, desc: '개인 인벤토리' },
  { id: 'market', name: '블랙마켓', icon: ShoppingCart, desc: '아이템 거래소' },
  { id: 'map', name: '교내 지도', icon: Map, desc: '건물 및 시설 정보' },
  { id: 'students', name: '학생 명부', icon: Users, desc: '상태 조회' },
  { id: 'radio', name: 'EVP 라디오', icon: Radio, desc: '주파수 탐색' },
  { id: 'scanner', name: 'QR 스캐너', icon: Scan, desc: '단서 및 코드 인식' },
  // [신규: 앱 항목 추가]
  { id: 'secretbox', name: '비밀 정보함', icon: Lock,     desc: '개인 기밀 정보 모음' },
  { id: 'rewards',   name: '보상 신청',   icon: Gift,       desc: '탐사 보상 신청' },
  { id: 'relations', name: '관계망',      icon: Network,    desc: '캐릭터 관계 관리' },
  { id: 'logs',      name: '활동 기록',   icon: History,    desc: '내 행동 타임라인' },
  { id: 'missions',  name: '특별 과제',   icon: Target,     desc: '비공개 미션 확인' },
  { id: 'tips',      name: '익명 제보함', icon: MessageCircle, desc: '익명 정보 교환' },
  { id: 'confession', name: '자백함',   icon: FileHeart,  desc: '익명 자백 (스트레스 감소)' },
];

interface AllAppsModalProps {
  onClose: () => void;
  onSelectApp: (id: string) => void;
}

export const AllAppsModal: React.FC<AllAppsModalProps> = ({ onClose, onSelectApp }) => {
  const { profile, updateFavorites } = useGame();
  
  // Default favorites if empty
  const favorites = profile?.favoriteApps || ["board", "terminal", "market", "archive"];

  const toggleFavorite = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    let newFavorites;
    if (favorites.includes(appId)) {
      newFavorites = favorites.filter(id => id !== appId);
    } else {
      newFavorites = [...favorites, appId];
    }
    await updateFavorites(newFavorites);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#F1F5F9] w-full rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
      >
        <div className="p-6 pb-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10 sticky top-0">
          <h2 className="text-xl font-black text-[#0F172A] tracking-tight">전체 메뉴 및 편집</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
             <span className="font-bold text-sm">✕</span>
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto w-full max-w-lg mx-auto flex-1">
           <div className="space-y-2">
              {ALL_APPS.map(app => {
                 const isFav = favorites.includes(app.id);
                 return (
                   <div 
                     key={app.id} 
                     onClick={() => {
                        onSelectApp(app.id);
                        onClose();
                     }}
                     className="bg-white rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] p-4 flex items-center mb-2 border border-slate-100 cursor-pointer hover:border-slate-200 hover:shadow-md transition-all active:scale-[0.98]"
                   >
                      <button 
                         onClick={(e) => toggleFavorite(e, app.id)}
                         className="p-2 -ml-2 mr-2 group/star flex-shrink-0 focus:outline-none"
                      >
                         <Star 
                           className={cn(
                             "w-6 h-6 transition-all",
                             isFav ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-300 group-hover/star:text-yellow-200"
                           )} 
                         />
                      </button>
                      
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#0F172A] mr-4 border border-slate-100 flex-shrink-0">
                         <app.icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <h3 className="font-bold text-[#0F172A] text-sm md:text-base leading-tight truncate">{app.name}</h3>
                         <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">{app.desc}</p>
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </motion.div>
    </div>
  );
};
