import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Zap, AlertTriangle, MessageSquare, Send, Trash2, Plus, Globe, CloudRain, Sun, Wind } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDialog } from '../../contexts/DialogContext';

export const MasterGlobalEventPanel: React.FC = () => {
  const { confirm } = useDialog();
  const [logs, setLogs] = useState<any[]>([]);
  const [customEvent, setCustomEvent] = useState("");
  const [targetUid, setTargetUid] = useState("ALL");
  const [threatLevel, setThreatLevel] = useState<"low" | "medium" | "high">("low");

  useEffect(() => {
    const q = query(
      collection(db, 'event_logs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const triggerEvent = async () => {
    if (!customEvent.trim()) return;
    try {
      await addDoc(collection(db, 'event_logs'), {
        type: 'master_event',
        description: customEvent,
        descriptionMasked: `(경고) 구역 내 이상 현상 감지됨.`,
        threatLevel,
        targetUid,
        createdAt: serverTimestamp(),
      });

      // Also trigger a toast for the target
      await addDoc(collection(db, 'system', 'commands', 'active'), {
        type: 'toast',
        targetUid,
        payload: {
           message: `[시스템 알림] ${customEvent}`,
           type: threatLevel === 'high' ? 'error' : (threatLevel === 'medium' ? 'warning' : 'info')
        },
        createdAt: serverTimestamp(),
        executed: false
      });

      setCustomEvent("");
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "글로벌 이벤트가 발송되었습니다.", type: 'success' } }));
    } catch (err) {
      console.error(err);
    }
  };

  const clearLogs = async () => {
    if (!(await confirm({ title: '로그 삭제', message: "모든 이벤트 로그를 영구 삭제하시겠습니까? (DB 부하 주의)", isDestructive: true }))) return;
    // Note: In a real app, this should be done via a cloud function for efficiency
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "이 기능은 안전을 위해 비활성화되어 있습니다. 관리자 도구를 사용해 수동 삭제하십시오.", type: 'warning' } }));
  };

  const PRESET_EVENTS = [
    { title: "조명 꺼짐", desc: "학교 전체의 조명이 갑자기 암전되었습니다. 손전등이 없다면 움직이기 어렵습니다.", level: "medium" },
    { title: "정체불명의 소리", desc: "복도 끝에서 기괴한 웃음소리가 들려옵니다. 누군가 다가오고 있습니다.", level: "low" },
    { title: "시스템 오류", desc: "모든 단말기에서 원인을 알 수 없는 노이즈가 발생하며 화면이 깨집니다.", level: "high" },
    { title: "비린내", desc: "어디선가 짙은 피비린내가 진동합니다. 가까운 곳에서 사건이 발생한 것 같습니다.", level: "medium" },
    { title: "감시 강화", desc: "CCTV의 붉은 불빛이 당신을 집요하게 쫓습니다. 행동을 조심하십시오.", level: "medium" },
    { title: "환각", desc: "벽면의 낙서가 살아서 움직이는 것처럼 보입니다. 정신력이 소모됩니다.", level: "medium" },
    { title: "CCTV 감시 구역 진입", desc: "당신은 현재 누군가에게 감시당하고 있습니다. 누군가 당신의 위치를 알고 있습니다.", level: "medium" },
    { title: "누군가의 시선", desc: "등 뒤에서 차가운 시선이 느껴집니다. 뒤를 돌아봐도 아무도 없습니다.", level: "low" },
  ];

  return (
    <div className="space-y-6">
      {/* Event Trigger Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            긴급 이상 현상(글로벌 이벤트) 강제 발생
          </h3>
          <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[50%]">
            {/* Quick Presets */}
            {PRESET_EVENTS.map((p, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  setCustomEvent(p.desc);
                  setThreatLevel(p.level as any);
                }}
                className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-amber-100 text-[10px] font-bold rounded-full transition-colors border border-slate-200"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">이벤트 내용 (모든 학생에게 공지됨)</label>
            <textarea 
              value={customEvent}
              onChange={e => setCustomEvent(e.target.value)}
              placeholder="예: 4층 복도의 조명이 모두 꺼졌습니다. 누군가 당신의 사물함을 열려고 시도합니다."
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">대상 (UID 또는 ALL)</label>
            <input 
              type="text"
              value={targetUid}
              onChange={e => setTargetUid(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">위험 수준</label>
            <select 
              value={threatLevel}
              onChange={e => setThreatLevel(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="low">Low (안내)</option>
              <option value="medium">Medium (주의)</option>
              <option value="high">High (경고/위협)</option>
            </select>
          </div>
          <div className="md:col-span-8 flex items-end">
            <button 
              onClick={triggerEvent}
              className="w-full h-12 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 active:scale-95 transition-all"
            >
              <Send size={18} />
              이벤트 전송
            </button>
          </div>
        </div>
      </div>

      {/* Logs View */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Globe className="text-blue-400" size={18} />
              실시간 사건/사고 관찰 로그
            </h3>
            <button 
               onClick={clearLogs}
               className="text-[10px] bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg font-bold border border-white/5 transition-all"
            >
               전체 로그 압축(삭제)
            </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-3 group">
               <div className={cn(
                 "mt-1 w-2 h-2 rounded-full shrink-0",
                 log.threatLevel === 'high' ? "bg-rose-500" : (log.threatLevel === 'medium' ? "bg-amber-500" : "bg-blue-500")
               )} />
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">[{log.type}]</span>
                     <span className="text-[10px] text-slate-600 font-mono italic">
                        {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : '...'}
                     </span>
                  </div>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed truncate">{log.description}</p>
                  <p className="text-[9px] text-slate-500 mt-1">UID: {log.uid || log.targetUid || 'System'}</p>
               </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-20 text-center text-slate-500 text-xs font-bold font-mono">
              관측된 특이 현상이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
