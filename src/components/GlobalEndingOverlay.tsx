import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertTriangle, Disc } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const GlobalEndingOverlay: React.FC = () => {
    const { systemConfig, isAdmin } = useGame();

    if (!systemConfig || !systemConfig.endingMode) return null;

    const end = systemConfig.endingMode;

    const handleReset = async () => {
        if (!isAdmin) return;
        if (!window.confirm("엔딩 모드를 종료하시겠습니까?")) return;
        await updateDoc(doc(db, "system", "config"), { endingMode: null });
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto">
            {/* Background elements */}
            <div className={cn(
                "absolute inset-0 transition-colors duration-1000",
                end === 'A' ? "bg-slate-900" :
                end === 'B' ? "bg-rose-950" :
                "bg-black"
            )}>
                {/* Visual Artifacts */}
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/3/3a/Television_static.gif')] bg-cover" />
            </div>

            <AnimatePresence mode="wait">
                <motion.div 
                    key={end}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="relative z-10 p-8 md:p-12 text-center max-w-2xl mx-auto backdrop-blur-md rounded-[3rem]"
                >
                    {end === 'A' && (
                        <div className="space-y-6">
                            <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="mx-auto w-24 h-24 text-sky-400 flex items-center justify-center"
                            >
                                <Disc size={80} strokeWidth={1} />
                            </motion.div>
                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase" style={{ textShadow: '0 0 40px rgba(56,189,248,0.5)' }}>
                                ENDING A
                            </h1>
                            <div className="text-xl md:text-2xl font-bold text-sky-400 tracking-widest mt-2 uppercase">
                                [ 진실의 기록 ]
                            </div>
                            <div className="text-slate-300 font-medium leading-relaxed mt-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                <p>모든 퍼즐이 해제되었고, 감춰진 진실이 백일하에 드러났습니다.</p>
                                <p className="mt-2">루프는 드디어 종결되었으며, 닫혀있던 명원고등학교의 정문이 개방됩니다.</p>
                            </div>
                        </div>
                    )}

                    {end === 'B' && (
                        <div className="space-y-6">
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1] }} 
                                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                                className="mx-auto w-24 h-24 text-rose-500 flex items-center justify-center"
                            >
                                <ShieldAlert size={100} strokeWidth={1} />
                            </motion.div>
                            <h1 className="text-4xl md:text-6xl font-black text-rose-500 tracking-[0.2em] uppercase mix-blend-screen" style={{ textShadow: '0 0 40px rgba(244,63,94,0.8), 0 0 10px rgba(244,63,94,0.8)' }}>
                                ENDING B
                            </h1>
                            <div className="text-xl md:text-2xl font-bold text-rose-400 tracking-widest mt-2 uppercase">
                                [ 감염 확산 ]
                            </div>
                            <div className="text-rose-200 font-medium leading-relaxed mt-8 bg-rose-950/50 p-6 rounded-2xl border border-rose-900/50">
                                <p>학교 내의 스트레스 수치가 임계점을 돌파했습니다.</p>
                                <p className="mt-2">생존자들의 이성은 붕괴되었으며, 시스템은 복구 불가능한 손상을 입었습니다.</p>
                                <p className="mt-2 text-rose-500 font-bold">도주에 실패하셨습니다.</p>
                            </div>
                        </div>
                    )}

                    {end === 'C' && (
                        <div className="space-y-6">
                            <motion.div 
                                animate={{ opacity: [1, 0, 1] }} 
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="mx-auto w-24 h-24 text-amber-500 flex items-center justify-center"
                            >
                                <AlertTriangle size={100} strokeWidth={1} />
                            </motion.div>
                            <h1 className="text-4xl md:text-6xl font-black text-amber-500 tracking-widest uppercase" style={{ textShadow: '0 0 40px rgba(245,158,11,0.5)' }}>
                                ENDING C
                            </h1>
                            <div className="text-xl md:text-2xl font-bold text-amber-400 tracking-widest mt-2 uppercase">
                                [ 타임 아웃 ]
                            </div>
                            <div className="text-amber-100 font-medium leading-relaxed mt-8 bg-amber-950/20 p-6 rounded-2xl border border-amber-900/30">
                                <p>Doomsday Timer 종료.</p>
                                <p className="mt-2">최종 락다운이 발동되었으며 탈출구는 영원히 폐쇄되었습니다.</p>
                            </div>
                        </div>
                    )}

                    {isAdmin && (
                        <button 
                            onClick={handleReset}
                            className="mt-12 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm uppercase tracking-widest border border-white/20"
                        >
                            [마스터 권한] 엔딩 모드 해제
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
