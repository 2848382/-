import React from 'react';
import { Send, Speaker } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';

const QUICK_COMMANDS = [
  { label: '[방송] 루프 종료 임박', text: '딩-동-댕-동. 잠시 후 전 구역 폐쇄 및 초기화 절차가 시작됩니다.', type: 'toast' },
  { label: '[NPC] 교감', text: '지금 당장 기숙사로 돌아가세요! 돌아다닐 시간이 아닙니다.', type: 'toast' },
  { label: '[NPC] 매점 주인의 경고', text: '그거... 함부로 건드리면 안 될 텐데...', type: 'toast' },
  { label: '[시스템] 기상 나팔', text: '새로운 아침이 밝았습니다. 학생 여러분은 일과를 시작하시기 바랍니다.', type: 'toast' },
  { label: '[방송] 식사 시간', text: '현재 식당 운영 중입니다. 속히 배식받으시길 바랍니다.', type: 'toast' },
  { label: '[경고] 출입 통제', text: '해당 구역은 현재 통제 중입니다. 접근을 금합니다.', type: 'toast' },
  { label: '[NPC] 창밖의 누군가', text: '(창문을 두드리는 소리가 납니다) 똑. 똑.', type: 'toast' },
  { label: '[NPC] 울음소리', text: '어디선가 희미하게 훌쩍이는 소리가 들려옵니다.', type: 'toast' },
  { label: '[방송] 특별 퀘스트 안내', text: '자율학습 시간에 도서관에서 특별 지시사항을 하달합니다.', type: 'toast' }
];

export const QuickCommandPad: React.FC = () => {
    const { isAdmin } = useGame();

    const handleCommand = async (cmd: any) => {
        if (!isAdmin) return;
        const msgId = `master_cmd_${Date.now()}`;
        await setDoc(doc(db, 'system', 'commands', 'active', msgId), {
            type: cmd.type, // usually toast shows global alert
            targetUid: 'ALL',
            payload: { message: cmd.text },
            createdAt: serverTimestamp(),
            executed: false
        });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-8">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Speaker size={16} className="text-rose-500" />
                GM 퀵 커맨드 패드 (방송/시스템 메시지 전송)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_COMMANDS.map((cmd, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleCommand(cmd)}
                        className="bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-slate-100 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95 text-center h-24"
                    >
                        <span className="text-xs font-bold text-slate-700">{cmd.label}</span>
                        <Send size={14} className="text-indigo-500" />
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-4 text-right">
                클릭 시 *모든 접속자*에게 즉각 알림(Toast) 전송
            </p>
        </div>
    );
};
