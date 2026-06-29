import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  Megaphone,
  X,
  Plus,
  Image as ImageIcon,
  FileText,
  Send,
  Paperclip,
  User,
  Heart,
  EyeOff
} from "lucide-react";
import { useGame } from "../contexts/GameContext";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ActionMenu } from "./ActionMenu";

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorUid?: string;
  attachments?: any[];
  createdAt: any;
  likes?: number;
  isGlitch?: boolean;
}

export const NoticeBoard: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWrite, setShowWrite] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const [authorPopup, setAuthorPopup] = useState<{
    uid: string;
    name: string;
  } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("자유");
  const [attachments, setAttachments] = useState<
    { name: string; data: string; isImage: boolean }[]
  >([]);

  const { profile, user } = useGame();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "notices"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedNotices = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Notice
      );
      
      setNotices(fetchedNotices);
      setLoading(false);
    }, (err) => {
      console.error("Notice fetch error:", err);
      setError("데이터 로딩 실패");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const displayNotices = [...notices];

  // Hidden thread logic for Loop >= 5
  if (profile?.loops && profile.loops >= 5) {
    if (!displayNotices.find((n) => n.id === "glitch-thread-1")) {
      displayNotices.unshift({
        id: "glitch-thread-1",
        title: "[숨겨진 스레드] 제발 내 말 좀 믿어줘 이거 꿈 아니",
        content: "어제 분명히 야간자율학습 끝나고 집에 갔는데\n일어나니까 다시 아침 시간표야.\n\n근데 나만 그런 게 아닌 것 같아.\n저번에 복도에서 ㅁㅁㅁ도 나랑 똑같은 얘기 했어.\n선생님들 눈 피해서 매점 뒤로 와.\n우리가 찾아낸 규칙이 있",
        category: "???",
        authorName: "익명",
        createdAt: { seconds: Date.now() / 1000 },
        isGlitch: true,
      });
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000)
        return window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "파일 크기가 너무 큽니다 (최대 800KB). 실제 서비스에서는 클라우드 스토리지를 연동해야 합니다.", type: "warning" } }));
      const reader = new FileReader();
      const isImage = file.type.startsWith("image/");
      reader.onloadend = () => {
        setAttachments([
          ...attachments,
          { name: file.name, data: reader.result as string, isImage },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!newTitle.trim() || !newContent.trim() || !profile) return;
    try {
      await addDoc(collection(db, "notices"), {
        title: newTitle,
        content: newContent,
        category: newCategory,
        authorName: profile.name,
        authorUid: user?.uid,
        attachments: attachments,
        likes: 0,
        createdAt: serverTimestamp(),
      });
      setNewTitle("");
      setNewContent("");
      setAttachments([]);
      setShowWrite(false);
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "게시글 작성에 실패했습니다.", type: "error" } }));
    }
  };

  const handleLike = async (e: React.MouseEvent, noticeId: string) => {
    e.stopPropagation();
    if (noticeId.startsWith("glitch-")) return;
    try {
      const noticeRef = doc(db, "notices", noticeId);
      const target = notices.find(n => n.id === noticeId);
      if (target) {
        await updateDoc(noticeRef, { likes: increment(1) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return "방금 전";
    const date = new Date(ts.seconds * 1000);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
  };

  return (
    <section className="modern-card p-6 md:p-10 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 bg-slate-50 rounded-[1rem] flex items-center justify-center text-[#0F172A] border border-slate-200">
            <EyeOff size={24} />
          </div>
          <div>
            <h3 className="font-black text-2xl md:text-3xl text-[#0F172A] leading-tight tracking-tight">
              대나무숲
            </h3>
            <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase mt-1">
              철저하게 보장되는 익명 커뮤니티
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowWrite(!showWrite);
            setSelectedNotice(null);
          }}
          className="h-11 px-5 md:px-6 bg-[#0F172A] text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-[0_4px_12px_rgba(15,23,42,0.15)] whitespace-nowrap shrink-0 hover:bg-[#1E293B] hover:-translate-y-0.5 active:translate-y-0"
        >
          {showWrite ? <X size={16} /> : <Plus size={16} />}
          <span className="hidden sm:inline">
            {showWrite ? "닫기" : "새 글 작성"}
          </span>
          <span className="sm:hidden">{showWrite ? "닫기" : "글쓰기"}</span>
        </button>
      </div>

      {showWrite && (
        <div className="mb-10 p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl h-12 px-4 text-sm font-bold outline-none focus:border-[#0F172A]/30 md:w-32"
            >
              <option value="자유">자유</option>
              <option value="질문">질문</option>
              <option value="분실물">분실물</option>
              <option value="모임">모임</option>
              {profile?.role === 'admin' && <option value="공지">공지</option>}
            </select>
            <input
              type="text"
              placeholder="제목을 입력하세요..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-[#0F172A]/30"
            />
          </div>
          <textarea
            placeholder="내용을 입력하세요..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full h-40 bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-[#0F172A]/30 resize-none custom-scrollbar"
          />

          <div className="flex items-center gap-3">
            <label className="h-10 px-4 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer transition-all bg-white text-xs font-bold">
              <Paperclip size={16} />
              파일 첨부
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <span className="text-[10px] font-bold text-slate-400">
              최대 800KB 문서/이미지 파일
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 mt-2">
              {attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 group"
                >
                  {file.isImage ? (
                    <ImageIcon size={14} className="text-[#0F172A]" />
                  ) : (
                    <FileText size={14} className="text-slate-400" />
                  )}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() =>
                      setAttachments(attachments.filter((_, idx) => idx !== i))
                    }
                    className="text-slate-400 hover:text-red-500 ml-1 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handlePost}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="w-full md:w-auto md:px-8 h-12 bg-[#0F172A] text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#1E293B] active:scale-[0.98] transition-all ml-auto"
            >
              <Send size={16} /> 작성 완료
            </button>
          </div>
        </div>
      )}

      {/* Board List */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left border-collapse bg-white">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-4 w-16 text-center">분류</th>
              <th className="py-4 px-4">제목</th>
              <th className="py-4 px-4 w-24 text-center hidden md:table-cell">
                작성자
              </th>
              <th className="py-4 px-4 w-20 text-center">공감</th>
              <th className="py-4 px-4 w-24 text-center hidden sm:table-cell">시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-[#0F172A] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                   <div className="flex flex-col items-center justify-center gap-2">
                      <X className="text-red-500" size={32} />
                      <p className="text-sm font-bold text-red-500">{error}</p>
                   </div>
                </td>
              </tr>
            ) : displayNotices.length > 0 ? (
              displayNotices.map((notice) => (
                <tr
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className={cn(
                    "cursor-pointer transition-colors group hover:bg-slate-50",
                    notice.isGlitch ? "animate-pulse bg-red-50/30 hover:bg-red-50/50" : ""
                  )}
                >
                  <td className="py-4 px-4 text-center">
                    <span
                      className={cn(
                        "text-[10px] md:text-xs font-black px-2 py-1 rounded-md border",
                        notice.category === "공지"
                          ? "bg-red-50 text-red-600 border-red-100 uppercase"
                          : notice.category === "자유"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : notice.isGlitch
                              ? "bg-red-950 text-red-500 border-red-900"
                              : notice.category === "모임"
                                ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                : "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {notice.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm md:text-base font-bold truncate max-w-[150px] sm:max-w-[300px] md:max-w-[400px]",
                          notice.category === "공지"
                            ? "text-[#0F172A]"
                            : notice.isGlitch
                              ? "text-red-700 font-black glitch-text-bleed"
                              : "text-slate-700",
                        )}
                      >
                        {notice.title}
                      </span>
                      {notice.attachments && notice.attachments.length > 0 && (
                        <Paperclip
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-xs font-bold text-slate-500 hidden md:table-cell truncate max-w-[100px]">
                    <span
                      className={cn(
                        notice.category === '공지' ? "text-[#0F172A]" : "text-slate-500",
                        notice.isGlitch ? "text-red-900" : ""
                      )}
                    >
                      {notice.category === '공지' ? notice.authorName : '익명'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-rose-500 transition-colors">
                          <Heart size={14} className={notice.likes ? "fill-rose-50 text-rose-500" : ""} />
                          <span>{notice.likes || 0}</span>
                      </div>
                  </td>
                  <td className="py-4 px-4 text-center text-xs font-bold text-slate-400 hidden sm:table-cell">
                    {formatDate(notice.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400">
                  <EyeOff size={40} className="mx-auto mb-3 opacity-20 text-slate-500" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                    첫 번째 익명글을 남겨주세요
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNotice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm relative">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className={cn(
                  "flex items-center justify-between p-4 md:p-6 border-b border-slate-200",
                  selectedNotice.isGlitch ? "bg-red-950" : "bg-slate-50"
              )}>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[10px] md:text-[11px] font-black px-2.5 py-1 rounded-md border",
                      selectedNotice.category === "공지"
                        ? "bg-red-50 text-red-600 border-red-100"
                        : selectedNotice.isGlitch
                          ? "bg-transparent text-red-500 border-red-900"
                          : "bg-white text-slate-500 border-slate-200",
                    )}
                  >
                    {selectedNotice.category}
                  </span>
                  <div className={cn("text-[10px] font-bold uppercase", selectedNotice.isGlitch ? "text-red-500 opacity-50" : "text-slate-400")}>
                    {selectedNotice.createdAt?.seconds
                      ? new Date(
                          selectedNotice.createdAt.seconds * 1000,
                        ).toLocaleString()
                      : "방금 전"}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className={cn(
                  "p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar relative",
                  selectedNotice.isGlitch ? "bg-[#050505]" : "bg-white"
              )}>
                <h2 className={cn(
                    "text-heading text-[var(--color-primary-900)]",
                    selectedNotice.isGlitch ? "text-red-600 glitch-text-bleed" : "text-[#0F172A]"
                )}>
                  {selectedNotice.title}
                </h2>

                <div className={cn("flex items-center justify-between mb-8 pb-6 border-b", selectedNotice.isGlitch ? "border-red-900/50" : "border-slate-100")}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          selectedNotice.isGlitch ? "bg-red-950 text-red-500" : "bg-slate-100 text-[#0F172A]"
                      )}>
                        <EyeOff size={20} />
                      </div>
                      <div>
                        <div className={cn("text-sm font-black", selectedNotice.isGlitch ? "text-red-500" : "text-[#0F172A]")}>
                          {selectedNotice.category === '공지' ? selectedNotice.authorName : '익명'}
                        </div>
                        <div className={cn("text-[10px] font-bold uppercase", selectedNotice.isGlitch ? "text-red-900" : "text-slate-400")}>
                          명원고 재학생
                        </div>
                      </div>
                    </div>
                    
                    <button 
                       onClick={(e) => handleLike(e, selectedNotice.id)}
                       className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors",
                          selectedNotice.likes ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200"
                       )}
                    >
                        <Heart size={14} className={selectedNotice.likes ? "fill-current" : ""} />
                        <span className="text-xs font-bold">{selectedNotice.likes || 0}</span>
                    </button>
                </div>

                <div className={cn(
                    "text-sm md:text-base leading-relaxed whitespace-pre-wrap min-h-[150px] font-medium",
                    selectedNotice.isGlitch ? "text-red-500 font-mono tracking-tighter" : "text-slate-700"
                )}>
                  {selectedNotice.content}
                </div>

                {/* Attachments Section */}
                {selectedNotice.attachments &&
                  selectedNotice.attachments.length > 0 && (
                    <div className="mt-10 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">
                        첨부파일 ({selectedNotice.attachments.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedNotice.attachments.map((file, i) => {
                          const isLegacy = typeof file === "string";
                          const fileData = isLegacy ? file : file.data;
                          const isImage = isLegacy ? true : file.isImage; // legacy uploads were only images
                          const fileName = isLegacy ? "첨부 이미지" : file.name;

                          return (
                            <div
                              key={i}
                              className="flex p-3 border border-slate-200 rounded-xl hover:border-[#0F172A]/50 transition-colors group cursor-pointer overflow-hidden items-center gap-3 bg-slate-50"
                            >
                              {isImage ? (
                                <img
                                  src={fileData}
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                  <FileText size={20} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-700 truncate group-hover:text-[#0F172A] transition-colors">
                                  {fileName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  파일 보기
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
};
