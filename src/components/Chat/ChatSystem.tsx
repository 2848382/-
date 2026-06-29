import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, getDocs, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ChatMessage, ChatRoom, UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User as UserIcon, ChevronLeft, Search, MessageCircle, Smile, Edit2, Trash2, MoreHorizontal, Check, X, Cpu, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ChatSystem: React.FC = () => {
  const { profile } = useGame();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forwardingText, setForwardingText] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    setError(null);

    // Listen for rooms where current user is a participant
    const q = query(
      collection(db, 'rooms'),
      where('participants', 'array-contains', profile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom)));
      setLoading(false);
    }, (err) => {
      console.error("Chat rooms fetch error:", err);
      setError("데이터 로딩 실패");
      setLoading(false);
    });

    // Also fetch students for new chats
    const studentsQ = query(collection(db, 'users'));
    const unsubscribeStudents = onSnapshot(studentsQ, (snapshot) => {
      const fetchedStudents = snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== profile.uid && u.role !== 'admin' && u.email !== '10049810a@gmail.com' && !u.isAdmin);
      
      const npcUser: UserProfile[] = [
        {
          uid: 'UNKNOWN_NPC',
          name: 'UNKNOWN_NPC',
          email: 'unknown@myeongwon.hs.kr',
          studentId: '????-???',
          academicAchievement: 0,
          attendanceDays: 0,
          memoryPoints: 0,
          stamina: 0,
          balance: 0,
          trauma: 0,
          loops: 0,
          bonding: 0,
          rebellion: 0,
          physical: 0,
          stress: 0,
          penaltyPoints: 0,
          inventory: [],
          badges: [],
          secureCode: '0000',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uid: 'STORE_AUNTIE',
          name: '매점 아주머니',
          email: 'store@myeongwon.hs.kr',
          studentId: 'NPC-STORE',
          academicAchievement: 0,
          attendanceDays: 0,
          memoryPoints: 0,
          stamina: 0,
          balance: 0,
          trauma: 0,
          loops: 0,
          bonding: 0,
          rebellion: 0,
          physical: 0,
          stress: 0,
          penaltyPoints: 0,
          inventory: [],
          badges: [],
          secureCode: '0000',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uid: 'PRINCIPAL',
          name: '교장 선생님',
          email: 'principal@myeongwon.hs.kr',
          studentId: 'NPC-ADMIN',
          academicAchievement: 0,
          attendanceDays: 0,
          memoryPoints: 0,
          stamina: 0,
          balance: 0,
          trauma: 0,
          loops: 0,
          bonding: 0,
          rebellion: 0,
          physical: 0,
          stress: 0,
          penaltyPoints: 0,
          inventory: [],
          badges: [],
          secureCode: '0000',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      setAllStudents([...fetchedStudents, ...npcUser]);
    });

    return () => {
      unsubscribe();
      unsubscribeStudents();
    };
  }, [profile]);

  const startChat = async (targetUser: UserProfile) => {
    if (!profile) return;
    
    // Check if room already exists
    const existingRoom = rooms.find(r => r.participants.includes(targetUser.uid));
    if (existingRoom) {
      setSelectedRoomId(existingRoom.id);
      return;
    }

    // Create new room
    const roomId = [profile.uid, targetUser.uid].sort().join('_');
    await setDoc(doc(db, 'rooms', roomId), {
      participants: [profile.uid, targetUser.uid],
      updatedAt: serverTimestamp(),
      lastMessage: ''
    });
    setSelectedRoomId(roomId);
  };

  const forwardToRoom = async (targetRoomId: string) => {
    if (!forwardingText || !profile) {
      console.warn("Forwarding failed: missing text or profile", { forwardingText, profile: !!profile });
      return;
    }
    
    try {
      console.log("Forwarding message to room:", targetRoomId);
      // Show sending alert immediately
      const textToForward = forwardingText;
      
      await addDoc(collection(db, 'rooms', targetRoomId, 'messages'), {
        senderId: profile.uid,
        text: `[전달됨] ${textToForward}`,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'rooms', targetRoomId), {
        lastMessage: `[전달됨] ${textToForward}`,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log("Forwarding success");
      setForwardingText(null);
      setTimeout(() => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '성공적으로 전달되었습니다.', type: "success" } })), 100);
    } catch (err) {
      console.error("Forwarding failed with error:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '전달에 실패했습니다. 권한이 없거나 네트워크 오류일 수 있습니다.', type: "error" } }));
    }
  };

  const renderContent = () => {
    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      const otherUserId = room?.participants.find(p => p !== profile?.uid);
      const otherUser = allStudents.find(s => s.uid === otherUserId);
      
      return (
        <ChatRoomView 
          roomId={selectedRoomId} 
          otherUser={otherUser} 
          onBack={() => setSelectedRoomId(null)} 
          onForward={(text) => setForwardingText(text)}
        />
      );
    }

    return (
      <div className="max-w-md mx-auto w-full px-0 md:px-0 h-full flex flex-col relative">
        <div className="bg-white overflow-hidden h-[80vh] md:h-[650px] flex flex-col border border-gray-100 md:rounded-3xl shadow-sm">
          <div className="p-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">메시지</h2>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-gray-100 rounded-xl pl-11 pr-4 text-sm font-medium border-none focus:ring-0 transition-all outline-none placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs font-medium space-y-4">
               <div className="w-8 h-8 rounded-full border-2 border-indigo-100 border-t-indigo-500 animate-spin" />
               <span>메시지 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
               <AlertCircle size={32} className="text-red-500 animate-pulse" />
               <div className="text-sm font-semibold text-red-500">{error}</div>
            </div>
          ) : search ? (
            <div className="p-2 space-y-1">
              {allStudents.filter(s => s.name.includes(search)).map(student => (
                <StudentItem key={student.uid} student={student} onClick={() => startChat(student)} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {rooms.map(room => {
                 const otherId = room.participants.find(p => p !== profile?.uid);
                 const student = allStudents.find(s => s.uid === otherId);
                 if (!student) return null;
                 return (
                   <button 
                     key={room.id}
                     onClick={() => setSelectedRoomId(room.id)}
                     className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50/40 transition-all text-left group active:bg-gray-100"
                   >
                     <div className="shrink-0 relative">
                       <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center border border-gray-50 overflow-hidden shadow-sm group-hover:ring-2 group-hover:ring-indigo-100 group-active:scale-95 transition-all">
                          {student.uid === 'AI_MYEONGWON' ? (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                              <Cpu size={24} />
                            </div>
                          ) : (
                            student.photoURL ? <img src={student.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-400" size={24} />
                          )}
                       </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm mb-0.5 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                        <div className="text-xs text-gray-500 truncate pr-4">{room.lastMessage || '새 대화'}</div>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                       <span className="text-[10px] text-gray-400 whitespace-nowrap">{room.updatedAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       <ChevronLeft size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 rotate-180 transition-all -translate-x-2 group-hover:translate-x-0" />
                     </div>
                   </button>
                 );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                 <MessageCircle size={32} strokeWidth={1.5} className="text-gray-400" />
               </div>
               <div className="space-y-1">
                 <div className="text-sm font-semibold text-gray-900">대화가 없습니다</div>
                 <div className="text-xs text-gray-500">친구에게 메시지를 보내보세요.</div>
               </div>
               <button 
                 onClick={() => setSearch(' ')} 
                 className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
               >
                  메시지 보내기
               </button>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingText && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setForwardingText(null)}>
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[70vh] border border-white/20"
               onClick={(e) => e.stopPropagation()}
             >
               <div className="p-6 pb-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div>
                   <h3 className="text-lg font-black text-gray-900 leading-none mb-1">전달하기</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Forward Message</p>
                 </div>
                 <button onClick={() => setForwardingText(null)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 shadow-sm"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-white">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">보낼 채팅방 선택</p>
                 {rooms.map(room => {
                    const otherId = room.participants.find(p => p !== profile?.uid);
                    const student = allStudents.find(s => s.uid === otherId);

                    if (!otherId && room.participants.length < 2) return null; // Edge case
                    const displayName = student ? student.name : (otherId === 'AI_MYEONGWON' ? '명원이 (AI)' : '알 수 없는 사용자');
                    const isNpc = student ? ['UNKNOWN_NPC', 'STORE_AUNTIE', 'PRINCIPAL'].includes(student.uid) : false;
 
                    return (
                      <button 
                        key={room.id}
                        onClick={(e) => {
                          e.preventDefault();
                          forwardToRoom(room.id);
                        }}
                        className="w-full p-4 rounded-3xl border border-gray-50 bg-gray-50/30 hover:border-blue-200 hover:bg-blue-50/50 flex items-center justify-between transition-all group active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white bg-gray-100 flex items-center justify-center">
                            {isNpc ? (
                              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                                <Cpu size={20} />
                              </div>
                            ) : (
                              student?.photoURL ? <img src={student.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-300 w-full h-full p-2" />
                            )}
                          </div>
                          <span className="font-bold text-sm text-gray-700">{displayName}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                          <ChevronLeft size={16} className="rotate-180" />
                        </div>
                      </button>
                    );
                 })}
                 {rooms.length === 0 && (
                   <div className="text-center py-10">
                     <p className="text-sm font-bold text-gray-400">채팅방이 없습니다.</p>
                   </div>
                 )}
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const StudentItem = ({ student, onClick }: { student: UserProfile, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50/50 transition-all text-left group active:scale-[0.98]"
  >
    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm group-hover:ring-2 group-hover:ring-indigo-100 transition-all">
       {['UNKNOWN_NPC', 'STORE_AUNTIE', 'PRINCIPAL'].includes(student.uid) ? (
         <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
           <Cpu size={24} />
         </div>
       ) : (
         student.photoURL ? <img src={student.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-300" size={18} />
       )}
    </div>
    <div className="flex-1">
       <div className="flex items-center gap-2">
         <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{student.name}</div>
         {['UNKNOWN_NPC', 'STORE_AUNTIE', 'PRINCIPAL'].includes(student.uid) && <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">NPC</span>}
       </div>
       <div className="text-[10px] text-gray-500 font-medium tracking-tight truncate">{student.studentId} • {student.email}</div>
    </div>
    <ChevronLeft size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 rotate-180 transition-all -translate-x-2 group-hover:translate-x-0" />
  </button>
);

const ChatRoomView = ({ roomId, otherUser, onBack, onForward }: { roomId: string, otherUser?: UserProfile, onBack: () => void, onForward: (text: string) => void }) => {
  const { profile } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [lastTypedText, setLastTypedText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(newMessages);
    });

    return unsubscribe;
  }, [roomId, profile?.uid, otherUser?.uid]);

  const handleTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    
    // Check for deleted draft (user typed something, then deleted it or cleared it without sending)
    if (lastTypedText.length > 5 && newText.length < lastTypedText.length - 3 && newText === '') {
      if (profile?.uid) {
        try {
          await addDoc(collection(db, 'event_logs'), {
            uid: profile.uid,
            type: 'custom',
            description: `[채팅 삭제됨] 상대: ${otherUser?.name || '알 수 없음'}\n내용: ${lastTypedText}`,
            descriptionMasked: `(통신망 감지) 삭제된 임시 메시지 기록 발견.`,
            loopIndex: (profile as any).loops || 1,
            createdAt: serverTimestamp()
          });
        } catch(e) { console.error('Failed to log deleted draft', e); }
      }
    }
    
    setText(newText);
    setLastTypedText(newText);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !profile) return;
    if (profile.isCardFrozen) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "행정실에 의해 통신 장치가 정지되었습니다.", type: "error" } }));
      return;
    }

    const msgText = text;
    setText('');
    setLastTypedText('');

    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      senderId: profile.uid,
      text: msgText,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'rooms', roomId), {
      lastMessage: msgText,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return (
    <div className="max-w-md mx-auto w-full px-0 md:px-0 h-full flex flex-col">
      <div className="bg-white overflow-hidden h-[80vh] md:h-[650px] flex flex-col border border-gray-100 md:rounded-3xl shadow-lg">
         <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
               <button onClick={onBack} className="p-1 -ml-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors">
                  <ChevronLeft size={28} />
               </button>
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                     {otherUser?.uid && ['UNKNOWN_NPC', 'STORE_AUNTIE', 'PRINCIPAL', 'AI_MYEONGWON'].includes(otherUser.uid) ? (
                       <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                         <Cpu size={20} />
                       </div>
                     ) : (
                       otherUser?.photoURL ? <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="text-gray-300" size={20} />
                     )}
                  </div>
                  <div>
                     <div className="flex items-center gap-1.5 leading-none mb-0.5">
                       <div className="font-semibold text-gray-900 text-sm">{otherUser?.name || '기다려주세요...'}</div>
                       {otherUser?.uid && ['UNKNOWN_NPC', 'STORE_AUNTIE', 'PRINCIPAL'].includes(otherUser.uid) && (
                         <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">NPC</span>
                       )}
                     </div>
                     <div className="text-[10px] text-gray-500 font-medium tracking-tight">현재 활동 중</div>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white relative">
          {messages.map((msg, index) => (
            <MessageItem 
              key={msg.id} 
              roomId={roomId}
              msg={msg} 
              isMe={msg.senderId === profile?.uid}
              otherUser={otherUser}
              showAvatar={msg.senderId !== profile?.uid && (index === messages.length - 1 || messages[index + 1].senderId !== msg.senderId)}
              showName={msg.senderId !== profile?.uid && (index === 0 || messages[index - 1].senderId !== msg.senderId)}
              onForward={onForward}
            />
          ))}
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-gray-300" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-900">대화 시작</div>
                  <div className="text-xs text-gray-500">메시지를 보내 대화를 시작하세요.</div>
                </div>
             </div>
          )}
       </div>

        <div className="p-4 bg-white border-t border-gray-50 flex-shrink-0">
          <div className="relative flex items-center gap-2">
            <form onSubmit={send} className="relative flex-1 flex items-center group">
              <input 
                 type="text"
                 value={text}
                 onChange={handleTextChange}
                 placeholder="메시지 보내기..."
                 className="w-full bg-gray-100 border border-gray-200 rounded-full py-3.5 pl-6 pr-16 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-inner"
              />
              {text.trim() && (
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500 text-white rounded-full p-2 hover:bg-indigo-600 active:scale-90 transition-all shadow-md group-hover:shadow-lg"
                >
                   <Send size={16} />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageItem = ({ roomId, msg, isMe, otherUser, showAvatar, showName, onForward }: { roomId: string, msg: ChatMessage, isMe: boolean, otherUser?: UserProfile, showAvatar: boolean, showName: boolean, onForward: (text: string) => void }) => {
  const { profile } = useGame();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text);
  const longPressTimer = React.useRef<any>(null);

  // Sync editText if msg.text changes from server
  useEffect(() => {
    setEditText(msg.text);
  }, [msg.text]);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const addReaction = async (emoji: string) => {
    if (!profile) return;
    const msgRef = doc(db, 'rooms', roomId, 'messages', msg.id);
    const reactions = msg.reactions || {};
    const existingReactions = reactions[emoji] || [];
    
    if (existingReactions.includes(profile.uid)) {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayRemove(profile.uid)
      });
    } else {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayUnion(profile.uid)
      });
    }
    setShowMenu(false);
  };

  const handleEdit = async () => {
    if (!editText.trim() || editText === msg.text) {
      setIsEditing(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'messages', msg.id), {
        text: editText,
        isEdited: true
      });
      setIsEditing(false);
      setShowMenu(false);
    } catch (err) {
      console.error("Edit failed:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "메시지 수정 권한이 없거나 오류가 발생했습니다.", type: "error" } }));
    }
  };

  const handleUnsend = async () => {
    if (window.confirm('메시지 전송을 취소하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId, 'messages', msg.id));
      } catch (err) {
        console.error("Unsend failed:", err);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "전송 취소에 실패했습니다.", type: "error" } }));
      }
    }
    setShowMenu(false);
  };

  return (
    <div className={cn("flex flex-col w-full group/msg relative", isMe ? "items-end" : "items-start")}>
      {!isMe && showName && (
        <span className="text-[10px] text-gray-400 ml-11 mb-1 font-bold">{otherUser?.name}</span>
      )}
      
      <div className={cn("flex items-end gap-2 max-w-[85%] relative", isMe ? "flex-row-reverse" : "flex-row")}>
        {!isMe && (
          <div className="w-8 h-8 shrink-0">
            {showAvatar && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                {otherUser?.photoURL ? 
                  <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" /> : 
                  <UserIcon className="text-gray-300 w-full h-full p-1.5" />
                }
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-end relative">
          <motion.div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
            layout
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm leading-snug cursor-pointer select-none transition-all active:scale-[0.98] shadow-sm",
              isMe 
                ? "bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-rose-500 text-white rounded-br-sm shadow-md" 
                : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm hover:bg-gray-200"
            )}
          >
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                  className="bg-transparent border-none outline-none text-white w-full text-sm font-medium"
                />
                <button onClick={handleEdit} className="text-white shrink-0 hover:scale-110 active:scale-95"><Check size={16} /></button>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="break-all">{msg.text}</span>
                {msg.isEdited && (
                  <div className={cn(
                    "text-[8px] mt-1 font-black uppercase tracking-tighter self-end flex items-center gap-1",
                    isMe ? "text-blue-100" : "text-gray-400"
                  )}>
                    <Edit2 size={8} /> 수정됨
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {msg.reactions && Object.entries(msg.reactions).some(([_, users]) => users.length > 0) && (
            <div className={cn(
              "flex flex-wrap gap-1 mt-1 z-10",
              isMe ? "justify-end" : "justify-start"
            )}>
              {Object.entries(msg.reactions).map(([emoji, userIds]) => userIds.length > 0 && (
                <button 
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="bg-white border border-gray-100 shadow-sm rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 hover:border-blue-200 transition-all hover:scale-110"
                >
                  <span>{emoji}</span>
                  <span className="font-bold text-gray-400">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: isMe ? 10 : -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "absolute z-50 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 p-1.5 min-w-[140px]",
                  isMe ? "bottom-full mb-3 right-0" : "top-full mt-3 left-0"
                )}
              >
                <div className="flex items-center justify-between px-2 py-1 mb-1 bg-gray-50/50 rounded-xl">
                  {['❤️', '👍', '🔥', '😮', '😢', '😡'].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => addReaction(emoji)}
                      className="text-lg hover:scale-125 transition-transform p-1 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-0.5">
                  {isMe ? (
                    <>
                      <button 
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} className="text-gray-400" /> 메시지 수정
                      </button>
                      <button 
                        onClick={handleUnsend}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border-t border-gray-50 mt-1"
                      >
                        <Trash2 size={14} className="text-red-400" /> 전송 취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '클립보드에 복사되었습니다.', type: "success" } }));
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={14} className="text-gray-400" /> 메시지 복사
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      onForward(msg.text);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Send size={14} className="text-gray-400" /> 전달하기
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity", isMe ? "mr-1" : "ml-11")}>
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
          {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
};
