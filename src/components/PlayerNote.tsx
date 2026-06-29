import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useGame } from "../contexts/GameContext";
import Markdown from "react-markdown";
import { FilePenLine, Lock, BookOpen, Save, Loader2, Globe, FileSignature, Paintbrush } from "lucide-react";
import { cn } from "../lib/utils";
import { Whiteboard } from "./Whiteboard";
import { SecretNoteModal } from "./SecretNoteModal";

export const PlayerNote: React.FC = () => {
  const { user, profile } = useGame();
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [isOverridden, setIsOverridden] = useState(false);
  const [overrideContent, setOverrideContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [viewMode, setViewMode] = useState<'personal' | 'shared'>('personal');
  const [showSecretNote, setShowSecretNote] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const noteRef = doc(db, "player_notes", user.uid);
    
    // Create empty document if it doesn't exist
    getDoc(noteRef).then(snap => {
      if (!snap.exists()) {
        setDoc(noteRef, {
          content: "# 조사 노트\n\n조사한 단서를 자유롭게 기록하세요.",
          isOverridden: false,
          overrideContent: "",
          isPublic: false,
          updatedAt: serverTimestamp()
        }).catch(err => console.error("Initial doc error", err));
      }
    });

    // Listen for realtime updates (important for GM override)
    const unsubscribe = onSnapshot(noteRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!isEditing) {
          setContent(data.content || "");
        }
        setIsOverridden(!!data.isOverridden);
        setOverrideContent(data.overrideContent || "");
        setIsPublic(!!data.isPublic);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isEditing]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "player_notes", user.uid), {
        content,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "player_notes", user.uid), {
        isPublic: !isPublic,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const displayContent = isOverridden ? overrideContent : content;
  
  // A subtle hint for loops
  const isGlitchMode = profile?.loops && profile.loops >= 7;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
      {/* Note Header */}
      <div className="shrink-0 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
         <div>
            <h2 className="text-heading text-[var(--color-primary-900)]">
               <BookOpen size={28} className="text-slate-400" />
               조사 노트
            </h2>
            <div className="flex items-center gap-2 mt-3">
               <div className="bg-slate-100 p-1 rounded-xl flex">
                  <button 
                    onClick={() => setViewMode('personal')}
                    className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'personal' ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-400 hover:text-slate-600")}
                  >
                     개인 기록
                  </button>
                  <button 
                    onClick={() => setViewMode('shared')}
                    className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'shared' ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-400 hover:text-slate-600")}
                  >
                     공개 화이트보드
                  </button>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
            <button
               onClick={() => setShowSecretNote(true)}
               className="flex items-center gap-2 px-4 py-2 bg-[#FFFDF5] text-slate-700 rounded-xl border border-amber-200/50 text-xs font-black shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all hover:shadow-md group"
            >
               <FileSignature size={16} className="text-amber-600 group-hover:rotate-12 transition-transform" />
               <span className="hidden sm:inline">쪽지 쓰기</span>
            </button>
            
            {profile?.role === 'admin' && viewMode === 'personal' && (
              <button 
                onClick={togglePublic}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-white rounded-xl border text-xs font-bold transition-all shadow-sm",
                  isPublic 
                    ? "border-indigo-200 text-indigo-600 bg-indigo-50" 
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? "전체 공개 중" : "비공개 (개인용)"}
              </button>
            )}
            
            {isEditing && viewMode === 'personal' ? (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                저장하기
              </button>
            ) : viewMode === 'personal' ? (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                disabled={isOverridden}
                className="flex items-center gap-2 px-5 py-2 bg-white text-[#0F172A] rounded-xl border border-slate-200 text-xs font-bold shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FilePenLine size={16} />
                수정하기
              </button>
            ) : null}
         </div>
      </div>

      {/* Note Body */}
      {viewMode === 'personal' ? (
        <div className={cn(
          "flex-1 modern-card p-6 md:p-8 flex flex-col relative overflow-hidden transition-all duration-700",
          isOverridden ? "bg-[#050505] border-red-900/50" : "bg-white"
        )}>
          {/* Decorative Binding */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100 hidden md:block"></div>
          <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-100 hidden md:block"></div>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar md:pl-8 pr-2 relative z-10">
              {isOverridden ? (
                <div className="animate-pulse">
                  <div className="markdown-body font-mono text-red-500 tracking-tighter text-sm md:text-base leading-relaxed glitch-text-bleed uppercase">
                    <Markdown>{displayContent}</Markdown>
                  </div>
                </div>
              ) : isEditing ? (
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full min-h-[400px] resize-none outline-none text-slate-700 leading-relaxed font-medium bg-transparent placeholder-slate-300"
                  placeholder="마크다운 문법으로 내용을 작성하세요..."
                />
              ) : (
                <div className="markdown-body text-slate-700 prose prose-slate prose-sm sm:prose-base max-w-none">
                  <Markdown>{displayContent}</Markdown>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Whiteboard />
        </div>
      )}
      
      {isOverridden && viewMode === 'personal' && (
        <div className="mt-4 flex items-center justify-center gap-3 text-red-500 text-xs font-bold tracking-widest uppercase animate-pulse">
          <Lock size={14} /> 서버 동기화 오류. 해당 문서를 수정할 수 없습니다.
        </div>
      )}

      {showSecretNote && <SecretNoteModal onClose={() => setShowSecretNote(false)} />}
    </div>
  );
};
