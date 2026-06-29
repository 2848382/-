import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useGame } from '../contexts/GameContext';
import { X, Send, Search, FileSignature } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface Message {
  senderId: string;
  senderName: string;
  content: string;
  createdAt: number;
}

interface SecretNote {
  id: string;
  participants: string[];
  exchangeCount: number;
  messages: Message[];
  updatedAt: any;
  targetName?: string;
}

export const SecretNoteModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, profile } = useGame();
  const [notes, setNotes] = useState<SecretNote[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [view, setView] = useState<'list' | 'new' | 'chat'>('list');
  const [selectedNote, setSelectedNote] = useState<SecretNote | null>(null);
  const [searchTarget, setSearchTarget] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isThrowing, setIsThrowing] = useState(false);

  // Fetch Students
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setStudents(
        snap.docs
          .map((d) => d.data() as UserProfile)
          .filter((s) => s.role !== 'admin' && s.email !== '10049810a@gmail.com' && !s.isAdmin)
      );
    });
    return () => unsub();
  }, [user]);

  // Fetch Notes
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'secret_notes'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => {
        const data = d.data();
        const otherUserId = data.participants.find((id: string) => id !== user.uid);
        const otherUser = students.find(s => s.uid === otherUserId);
        
        return {
          id: d.id,
          ...data,
          targetName: otherUser?.name || '알 수 없음'
        } as SecretNote;
      });
      // Sort in JS instead of compound index to avoid requiring an index
      fetched.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setNotes(fetched);
    });

    return () => unsubscribe();
  }, [user, students]);

  const handleCreateNote = async (targetUserId: string) => {
    if (!user || !profile) return;
    if (!messageContent.trim()) return;

    try {
      await addDoc(collection(db, 'secret_notes'), {
        participants: [user.uid, targetUserId],
        exchangeCount: 1, // Created
        updatedAt: serverTimestamp(),
        messages: [{
          senderId: user.uid,
          senderName: profile.name,
          content: messageContent,
          createdAt: Date.now()
        }]
      });
      setView('list');
      setMessageContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async () => {
    if (!user || !profile || !selectedNote) return;
    if (!messageContent.trim()) return;
    if (selectedNote.exchangeCount >= 4) return;

    try {
      const noteRef = doc(db, 'secret_notes', selectedNote.id);
      const newMessages = [...selectedNote.messages, {
        senderId: user.uid,
        senderName: profile.name,
        content: messageContent,
        createdAt: Date.now()
      }];

      await updateDoc(noteRef, {
        messages: newMessages,
        exchangeCount: selectedNote.exchangeCount + 1,
        updatedAt: serverTimestamp()
      });
      
      // Optimistic update
      setSelectedNote({
        ...selectedNote,
        messages: newMessages,
        exchangeCount: selectedNote.exchangeCount + 1
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleThrow = (action: () => Promise<void>) => {
     setIsThrowing(true);
     setTimeout(async () => {
        await action();
        setIsThrowing(false);
        setMessageContent('');
        setView('list');
     }, 1200);
  };

  // Torn paper aesthetic border
  const tornStyles = {
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 95%, 98% 100%, 95% 96%, 92% 100%, 89% 95%, 86% 100%, 83% 96%, 80% 100%, 77% 95%, 74% 100%, 71% 96%, 68% 100%, 65% 95%, 62% 100%, 59% 96%, 56% 100%, 53% 95%, 50% 100%, 47% 96%, 44% 100%, 41% 95%, 38% 100%, 35% 96%, 32% 100%, 29% 95%, 26% 100%, 23% 96%, 20% 100%, 17% 95%, 14% 100%, 11% 96%, 8% 100%, 5% 95%, 2% 100%, 0% 95%)',
    backgroundImage: 'url("https://www.transparenttextures.com/patterns/crumpled-paper.png")',
    backgroundColor: '#FFFDF5'
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-md">
       <AnimatePresence>
         {isThrowing && (
           <motion.div
              initial={{ scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px)', borderRadius: '0%', x: 0, y: 0 }}
              animate={{ 
                scale: [1, 0.5, 0.4, 0], 
                rotate: [0, 45, 180, 720],
                x: [0, 50, 200, 500],
                y: [0, -50, -100, -200],
                opacity: [1, 1, 0.8, 0],
                borderRadius: ['0%', '20%', '40%', '50%'],
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="fixed z-[9999] w-64 h-64 bg-[#FFFDF5] shadow-2xl flex items-center justify-center pointer-events-none"
              style={{ left: 'calc(50% - 128px)', top: 'calc(50% - 128px)', backgroundImage: 'url(https://www.transparenttextures.com/patterns/crumpled-paper.png)' }}
            >
               <div className="text-slate-800/20 w-32 h-32 border-4 border-slate-800/10 rounded-full" />
            </motion.div>
         )}
       </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col relative overflow-hidden h-[600px] border border-slate-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <FileSignature size={22} className="text-slate-400" />
            비밀 쪽지
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative bg-[#F8F9FA]">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 flex flex-col p-6"
              >
                <button 
                  onClick={() => setView('new')}
                  className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mb-6"
                >
                  <FileSignature size={18} /> 쪽지 찢어 던지기
                </button>
                
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">보관함</h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {notes.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm font-bold">주고받은 쪽지가 없습니다.</div>
                  ) : (
                    notes.map(note => (
                      <div 
                        key={note.id}
                        onClick={() => { setSelectedNote(note); setView('chat'); }}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[#0F172A]/30 cursor-pointer transition-all"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-[#0F172A] text-sm">{note.targetName}</span>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full border",
                              note.exchangeCount >= 4 ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                              {note.exchangeCount >= 4 ? '잠김' : '답장 대기'}
                            </span>
                         </div>
                         <div className="text-xs text-slate-500 truncate font-medium">
                           {note.messages[note.messages.length - 1]?.content}
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {view === 'new' && (
              <motion.div 
                key="new"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col p-6 pb-0"
              >
                <button onClick={() => setView('list')} className="text-xs font-bold text-slate-500 mb-6 flex items-center gap-1 hover:text-[#0F172A]">
                  &larr; 돌아가기
                </button>
                
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="받는 사람 검색..."
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    className="w-full h-12 bg-white rounded-xl pl-12 pr-4 text-sm font-bold border border-slate-200 outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div className="flex-1 -mx-6 overflow-hidden relative">
                   <div className="absolute inset-0 px-6 overflow-y-auto space-y-2 pb-6 custom-scrollbar">
                     {students
                       .filter(s => s.uid !== user?.uid && s.name.includes(searchTarget))
                       .map(student => (
                       <div key={student.uid} className="relative mt-2">
                         {/* Note piece aesthetic */}
                         <div className="bg-[#FFFDF5] shadow-sm relative pt-4 pb-14 px-5 mx-2" style={tornStyles}>
                           <div className="flex justify-between items-center mb-3">
                              <span className="font-[Brush_Script_MT,cursive] font-bold text-[#0F172A] opacity-80 text-lg">To. {student.name}</span>
                           </div>
                           <textarea 
                             placeholder="은밀한 메시지를 남기세요..."
                             className="w-full h-24 bg-transparent resize-none outline-none text-slate-700 text-sm font-medium placeholder-slate-400/50 leading-relaxed"
                             onChange={(e) => setMessageContent(e.target.value)}
                           />
                           
                           {/* Decorative lines */}
                           <div className="absolute inset-x-5 top-14 bottom-14 pointer-events-none opacity-[0.05]" 
                                style={{backgroundImage: 'linear-gradient(transparent 95%, #0F172A 100%)', backgroundSize: '100% 24px'}}></div>
                         </div>
                         
                         <button 
                           onClick={() => handleThrow(() => handleCreateNote(student.uid))}
                           disabled={!messageContent.trim()}
                           className="absolute bottom-4 right-6 w-10 h-10 bg-[#0F172A] text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 hover:bg-[#1E293B] transition-colors"
                         >
                           <Send size={16} className="-ml-1 inline" />
                         </button>
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}

            {view === 'chat' && selectedNote && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col p-6"
              >
                 <div className="flex justify-between items-center mb-6">
                    <button onClick={() => { setView('list'); setSelectedNote(null); }} className="text-xs font-bold text-slate-500 hover:text-[#0F172A]">
                      &larr; 돌아가기
                    </button>
                    <span className={cn(
                       "text-[10px] font-black px-2 py-0.5 rounded-full border",
                       selectedNote.exchangeCount >= 4 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                       {selectedNote.exchangeCount}/4 교환됨
                    </span>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-4 pr-1">
                    {selectedNote.messages.map((msg, idx) => (
                       <div key={idx} className={cn(
                          "bg-[#FFFDF5] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-5 relative",
                          msg.senderId === user?.uid ? "ml-auto border-l-4 border-[#0F172A]" : "mr-auto border-r-4 border-slate-300"
                       )} style={tornStyles}>
                           <div className="text-[10px] font-bold text-slate-400 mb-2">From. {msg.senderName}</div>
                           <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                       </div>
                    ))}

                    {selectedNote.exchangeCount >= 4 && (
                       <div className="text-center mt-8 p-4 bg-slate-100 rounded-2xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">종이가 낡아 더 이상 적을 수 없습니다</p>
                       </div>
                    )}
                 </div>

                 {selectedNote.exchangeCount < 4 && selectedNote.messages[selectedNote.messages.length - 1].senderId !== user?.uid && (
                    <div className="pt-4 mt-2 border-t border-slate-200 flex gap-2">
                       <input 
                         type="text" 
                         value={messageContent}
                         onChange={e => setMessageContent(e.target.value)}
                         placeholder="답장 쓰기..."
                         className="flex-1 h-12 bg-white rounded-xl px-4 text-sm font-medium border border-slate-200 outline-none focus:border-[#0F172A]"
                       />
                       <button 
                         onClick={() => handleThrow(() => handleReply())}
                         disabled={!messageContent.trim()}
                         className="h-12 w-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-[#1E293B] shadow-md transition-colors"
                       >
                          <Send size={16} />
                       </button>
                    </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
