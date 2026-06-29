import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { BotConfig } from '../../types';
import { MessageSquare, Trash2, Plus, Brain, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MasterNPCPanel: React.FC = () => {
  const [configs, setConfigs] = useState<BotConfig[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'system', 'data', 'botConfig'), orderBy('createdAt', 'desc')),
      (snap) => {
        setConfigs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BotConfig)));
      }
    );
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newKeyword.trim() || !newReply.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'system', 'data', 'botConfig'), {
        keyword: newKeyword.trim(),
        reply: newReply.trim(),
        createdAt: serverTimestamp()
      });
      setNewKeyword("");
      setNewReply("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 키워드 응답을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'system', 'data', 'botConfig', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="text-purple-400" size={24} />
          <h3 className="text-lg font-black text-white">NPC 지능 학습 (키워드 매칭)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">감지 키워드</label>
            <input 
              type="text"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="예: 안녕, 루프, 마스터"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">응답 내용</label>
            <input 
              type="text"
              value={newReply}
              onChange={e => setNewReply(e.target.value)}
              placeholder="NPC가 할 말..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button 
              onClick={handleAdd}
              disabled={isSaving || !newKeyword.trim() || !newReply.trim()}
              className="w-full h-12 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus size={18} />
              학습
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map(cfg => (
          <div key={cfg.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-black uppercase tracking-tighter">Keyword</span>
                <span className="text-sm font-black text-slate-900 underline decoration-purple-300 underline-offset-4">{cfg.keyword}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Reply</span>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{cfg.reply}"</p>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(cfg.id)}
              className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
