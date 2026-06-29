import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { Calendar, CheckSquare, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WEEKDAYS = ['월', '화', '수', '목', '금'];
const SUBJECTS = [
  ['문학', '수학Ⅰ', '영어Ⅰ', '운동과 건강', '탐구(선택)', '미술', '진로'],
  ['수학Ⅰ', '영어Ⅰ', '탐구(선택)', '문학', '탐구(선택)', '자율', '자습'],
  ['영어Ⅰ', '문학', '탐구(선택)', '수학Ⅰ', '운동과 건강', '음악', '자습'],
  ['탐구(선택)', '탐구(선택)', '수학Ⅰ', '영어Ⅰ', '문학', '정보', '자습'],
  ['탐구(선택)', '탐구(선택)', '미술', '수학Ⅰ', '문학', '동아리', '동아리'],
];

const getSubjectGuide = (subject: string): { msg: string, from: string, to: string, note: string } => {
  if (['문학', '수학Ⅰ', '영어Ⅰ'].includes(subject)) {
    return {
      msg: "공통 수업입니다. 본인 교실(2학년 2반)에서 준비하세요.",
      from: "현재 위치", to: "2학년 2반 교실",
      note: "돌발 이벤트 확률 낮음"
    };
  }
  if (subject.includes('탐구')) {
    return {
      msg: "본인이 선택한 사회/과학 탐구 수업입니다. 지정 교과실로 이동하세요.",
      from: "교실(2-2)", to: "지정 교과실",
      note: "가방, 교재 이동 필요 / 복도 이동 중 돌발 이벤트 확률 존재"
    };
  }
  if (subject === '운동과 건강' || subject === '체육') {
    return {
      msg: "체육 수업입니다. 체육복 환복 후 강당(체육관)으로 집합하세요.",
      from: "교실(2-2)", to: "강당(체육관)",
      note: "환복 필수 / 체력 소모 심함"
    };
  }
  if (subject === '정보') {
    return {
      msg: "정보 수업입니다. 태블릿/크롬북을 지참하여 제1정보실로 이동하세요.",
      from: "교실(2-2)", to: "제1정보실",
      note: "디지털 기기 지참 / 네트워크 연결 상태 점검"
    };
  }
  if (subject === '동아리' || subject.includes('동아리')) {
    return {
      msg: "동아리 활동 시간입니다. 각 신청 동아리실로 빠르게 이동하세요.",
      from: "교실(2-2)", to: "각 해당 동아리실",
      note: "동아리 외부인 접촉 가능성 / 특별 활동 기록 반영"
    };
  }
  if (['진로', '자율', '창체(자율)'].includes(subject)) {
    return {
      msg: "학급 활동 및 상담 시간입니다. 교실 혹은 상담실에서 대기하세요.",
      from: "교실(2-2)", to: "2학년 2반 또는 진로상담실",
      note: "담임 교사 임의 호출 가능성"
    };
  }
  if (subject === '자습') {
    return {
      msg: "자기주도 학습 시간입니다. 정숙을 유지하고 자리에 대기하세요.",
      from: "현재 위치", to: "현재 위치 (지정 좌석)",
      note: "소음 발생 시 경고 / 이동 통제"
    };
  }
  
  return {
    msg: "비교과 공통 수업입니다. 지정된 특별실로 이동하세요.",
    from: "교실(2-2)", to: `${subject}실`,
    note: "실습 도구 준비 / 교과 담당 교사 직권 통제"
  };
};

export const Timetable: React.FC = () => {
  const [currentDay, setCurrentDay] = useState(0); // 0 (Sun) to 6 (Sat)
  const [selectedSubject, setSelectedSubject] = useState<{subject: string, day: string, period: number} | null>(null);
  
  useEffect(() => {
    const today = new Date().getDay();
    setCurrentDay(today);
  }, []);

  return (
    <div className="mw-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h3 className="text-heading text-[var(--color-primary-900)]">
          <Calendar className="text-[var(--color-primary-500)]" size={24} /> 1~4주차 공통 시간표
        </h3>
      </div>
      
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="min-w-[500px]">
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="text-center font-bold text-[var(--color-neutral-400)] text-sm py-2 bg-[var(--color-neutral-50)] rounded-xl">교시</div>
            {WEEKDAYS.map((day, idx) => (
              <div key={day} className={cn("text-center font-bold text-sm py-2 rounded-xl", currentDay - 1 === idx ? "bg-[var(--color-primary-500)] text-white shadow-md" : "bg-[var(--color-neutral-50)] text-[var(--color-neutral-500)]")}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((period, periodIdx) => (
              <div key={period} className="grid grid-cols-6 gap-2">
                <div className="flex items-center justify-center font-black text-[var(--color-neutral-300)] text-xs bg-[var(--color-neutral-50)]/50 rounded-xl">
                  {period}교시
                </div>
                {WEEKDAYS.map((day, dayIdx) => (
                  <div 
                    key={`${day}-${period}`} 
                    onClick={() => setSelectedSubject({ subject: SUBJECTS[dayIdx][periodIdx], day, period })}
                    className={cn(
                      "flex items-center justify-center py-3 px-2 rounded-xl text-sm font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border",
                      currentDay - 1 === dayIdx 
                        ? "bg-[var(--color-primary-50)] border-[var(--color-primary-100)] text-[var(--color-primary-900)] shadow-sm" 
                        : "bg-white border-[var(--color-border)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-200)]"
                    )}
                  >
                    {SUBJECTS[dayIdx][periodIdx]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {(currentDay === 0 || currentDay === 6) && (
        <div className="mt-6 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <CheckSquare size={24} />
          </div>
          <div className="pt-1">
            <h4 className="text-subhead text-amber-900 mb-1">주말 특별 자습 (의무)</h4>
            <p className="text-sm font-medium text-amber-700/80 leading-relaxed">오늘은 주말입니다. 전교생은 도서관 및 열람실에서 자기주도 학습을 진행해야 합니다. 1~7교시 모두 자습으로 대체됩니다.</p>
          </div>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {selectedSubject && (() => {
            const guide = getSubjectGuide(selectedSubject.subject);
            return (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setSelectedSubject(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-[var(--color-border)] overflow-hidden"
                >
                  <div className="bg-[var(--color-primary-50)]/50 p-6 border-b border-[var(--color-primary-100)]/50 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-[var(--color-primary-100)] text-[var(--color-primary-600)] rounded-xl">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[var(--color-primary-900)]">
                          {selectedSubject.subject} 안내
                        </h3>
                        <p className="text-xs font-bold text-[var(--color-neutral-400)] mt-0.5">
                          {selectedSubject.day}요일 {selectedSubject.period}교시
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      className="p-2 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div className="space-y-1">
                      <div className="text-micro text-[var(--color-neutral-400)]">시스템 메시지</div>
                      <p className="text-sm font-bold text-[var(--color-neutral-700)] leading-relaxed bg-[var(--color-neutral-50)] p-3 rounded-xl border border-[var(--color-border)]">
                        {guide.msg}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-micro text-[var(--color-neutral-400)]">이동 동선 안내</div>
                      <div className="flex items-center justify-between bg-[var(--color-neutral-50)] p-3 rounded-xl border border-[var(--color-border)]">
                        <span className="text-xs font-bold text-[var(--color-neutral-500)]">{guide.from}</span>
                        <span className="text-xs font-black text-[var(--color-primary-500)] px-2">→</span>
                        <span className="text-xs font-bold text-[var(--color-primary-700)]">{guide.to}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-micro text-[var(--color-neutral-400)]">시스템 경고 / 특이사항</div>
                      <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100/50 p-3 rounded-xl">
                        {guide.note}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedSubject(null)}
                      className="w-full py-4 mt-2 mw-btn-primary"
                    >
                      확인 및 창 닫기
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
