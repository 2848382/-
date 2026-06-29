import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Activity, Flame, Users, Beaker } from 'lucide-react';
import { cn } from '../lib/utils';

export const EmotionThermometer: React.FC = () => {
    const { allStudents } = useGame();

    if (!allStudents || allStudents.length === 0) return null;

    const totalStudents = allStudents.length;
    const avgStress = Math.round(allStudents.reduce((acc, s) => acc + (s.stress || 0), 0) / totalStudents);
    const avgMemory = Math.round(allStudents.reduce((acc, s) => acc + (s.memoryPoints || 0), 0) / totalStudents);
    const avgPhysical = Math.round(allStudents.reduce((acc, s) => acc + (s.physical || 0), 0) / totalStudents);

    const highStressCount = allStudents.filter(s => (s.stress || 0) >= 80).length;
    const blankMindCount = allStudents.filter(s => (s.memoryPoints || 0) <= 20).length;
    const collapsedCount = allStudents.filter(s => (s.physical || 50) <= 20).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                <Users className="text-blue-500 mb-2" size={24} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">활성 생존자</span>
                <span className="text-3xl font-black text-slate-900">{totalStudents}<span className="text-base text-slate-400 font-medium ml-1">명</span></span>
            </div>
            
            <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                <Flame className="text-rose-500 mb-2" size={24} />
                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">평균 스트레스</span>
                <span className="text-3xl font-black text-rose-600">{avgStress}<span className="text-base text-rose-300 font-medium ml-1">%</span></span>
                <div className="w-full bg-rose-100 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${avgStress}%` }}></div>
                </div>
                <p className="text-[10px] text-rose-400 mt-2 font-bold">{highStressCount}명 위험 상태</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                <Beaker className="text-emerald-500 mb-2" size={24} />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">평균 육체 내구도</span>
                <span className="text-3xl font-black text-emerald-600">{avgPhysical}<span className="text-base text-emerald-300 font-medium ml-1">/100</span></span>
                <div className="w-full bg-emerald-100 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avgPhysical}%` }}></div>
                </div>
                <p className="text-[10px] text-emerald-400 mt-2 font-bold">{collapsedCount}명 신체 붕괴</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
                <Activity className="text-purple-500 mb-2" size={24} />
                <span className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">평균 기억 보존율</span>
                <span className="text-3xl font-black text-purple-600">{avgMemory}<span className="text-base text-purple-300 font-medium ml-1">PA</span></span>
                <p className="text-[10px] text-purple-400 mt-5 font-bold">{blankMindCount}명 자아 소실 위기</p>
            </div>
        </div>
    );
};
