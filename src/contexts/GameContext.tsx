import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc, getDoc, collection, addDoc, query, where, writeBatch, increment, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, GameState, InteractionAction, SystemConfig } from '../types';
import { generateStudentId, isStudentProfile, MASTER_EMAIL } from '../lib/utils';
import { usePlayerActions } from '../hooks/usePlayerActions';
import { useInventory } from '../hooks/useInventory';
import { useTransfer } from '../hooks/useTransfer';
import { useSystemLog } from '../hooks/useSystemLog';
import { useInteraction } from '../hooks/useInteraction';
import { logActivity } from '../services/activityLogService';
import { checkRateLimit } from '../hooks/useRateLimit';

interface GameContextType {
  user: User | null;
  profile: UserProfile | null;
  allStudents: UserProfile[]; // [R7]
  loading: boolean;
  isAdmin: boolean;
  gameState: GameState;
  updateAcademicProgress: (amount: number) => Promise<void>;
  updateAttendance: (amount: number) => Promise<void>;
  updateStamina: (amount: number) => Promise<void>;
  updateProfilePhoto: (url: string) => Promise<void>;
  consumeItem: (itemName: string, cost: number, staminaGain: number) => Promise<void>;
  sendMessage: (recipientId: string, text: string) => Promise<void>;
  transferWon: (targetLast4: string, amount: number, memo: string) => Promise<void>;
  sendMoney: (targetUid: string, amount: number, memo?: string) => Promise<void>;
  sendGift: (targetUid: string, itemName: string) => Promise<void>;
  checkIn: (locationId: string) => Promise<void>;
  canCheckInToday: boolean;  // [체크인]
  lastCheckInLocation: string | null;  // [체크인]
  addSystemLog: (log: string) => Promise<void>;
  interactWithStudent: (targetUid: string, action: InteractionAction) => Promise<void>;
  updateFavorites: (apps: string[]) => Promise<void>;
  setActiveView: (view: string) => Promise<void>;
  getUiText: (key: string, defaultText: string) => string;
  isMenuBlocked: (menuId: string) => boolean;
  logActivity: (actionType: string, description: string, severity?: 'info'|'warning'|'danger') => Promise<void>;
  systemConfig: SystemConfig | null;
  systemTimer: { endTime: number | null; active: boolean };
  systemEvents: any;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]); // [R7]
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [systemTimer, setSystemTimer] = useState<{ endTime: number | null; active: boolean }>({ endTime: null, active: false });
  const [systemEvents, setSystemEvents] = useState<any>(null);
  
  // [체크인] Check if can check-in today
  const canCheckInToday = React.useMemo(() => {
    if (!profile?.lastCheckIn) return true;
    const at = profile.lastCheckIn.at;
    if (!at) return false; // Pending server timestamp
    if (typeof at.toDate !== 'function') return false; // Not a fully resolved Timestamp yet
    const lastAt = at.toDate();
    const today = new Date();
    return !(
      lastAt.getFullYear() === today.getFullYear() &&
      lastAt.getMonth() === today.getMonth() &&
      lastAt.getDate() === today.getDate()
    );
  }, [profile?.lastCheckIn]);

  const lastCheckInLocation = canCheckInToday ? null : (profile?.lastCheckIn?.locationId ?? null);

  // [R1] God Context 분리
  const playerActions = usePlayerActions();
  const inventory = useInventory();
  const transfer = useTransfer();
  const logs = useSystemLog();
  const interactions = useInteraction();

  const [gameState, setGameState] = useState<GameState>({
    academicAchievement: 0,
    attendanceDays: 1,
    stamina: 100
  });

  const heartbeatDone = React.useRef(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubCommands: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;
    let unsubTimer: (() => void) | null = null;
    let unsubEvents: (() => void) | null = null;
    let unsubStudents: (() => void) | null = null; // [R7]
    const processedCommands = new Set<string>();
    heartbeatDone.current = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      // Clean up previous listeners
      [unsubProfile, unsubCommands, unsubConfig, unsubTimer, unsubEvents, unsubStudents].forEach(unsub => unsub?.());
      unsubProfile = unsubCommands = unsubConfig = unsubTimer = unsubEvents = unsubStudents = null;

      setUser(u);
      
      if (u) {
        // [R2] Admin check using helper
        const adminRef = doc(db, 'admins', u.uid);
        const adminDoc = await getDoc(adminRef);
        const isMaster = u.email === MASTER_EMAIL;
        setIsAdmin(adminDoc.exists() || isMaster);

        const userRef = doc(db, 'users', u.uid);
        
        unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as UserProfile;
            if (data.isBanned) {
              auth.signOut();
              alert('당신은 이 학교에서 "제명" 되었습니다.');
              return;
            }
            setProfile(data);
            setGameState({
              academicAchievement: data.academicAchievement || 0,
              attendanceDays: data.attendanceDays || 1,
              stamina: data.stamina ?? 100
            });

            if (!heartbeatDone.current) {
              heartbeatDone.current = true;
              updateDoc(userRef, { lastActive: serverTimestamp() }).catch(e => {
                console.error("Heartbeat error:", e.message);
              });
            }
          } else {
            createInitialProfile(u);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile fetch error:", error);
          setLoading(false);
        });

        // [R7] Global Students Listener
        unsubStudents = onSnapshot(collection(db, 'users'), (snap) => {
          setAllStudents(snap.docs
            .map(d => d.data() as UserProfile)
            .filter(s => isStudentProfile(s, u.uid)));
        }, (error) => { console.error("Global Students Listener Error:", error.message); });

        unsubCommands = onSnapshot(
          query(collection(db, "system", "commands", "active"), where("executed", "==", false)), 
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const cmd = change.doc.data();
                if (processedCommands.has(change.doc.id)) return;
                
                // Prevent reloading old commands (older than 2 minutes)
                const isOld = cmd.createdAt && (Date.now() - (cmd.createdAt.seconds * 1000) > 120000);
                if (isOld) return;

                if (cmd.targetUid === u.uid || cmd.targetUid === 'ALL') {
                  processedCommands.add(change.doc.id);
                  if (cmd.targetUid === u.uid) updateDoc(change.doc.ref, { executed: true }).catch(() => {});
                  if (cmd.type === 'jump') window.dispatchEvent(new CustomEvent('master_jump', { detail: cmd.payload.path }));
                  else if (cmd.type === 'toast') {
                    window.dispatchEvent(new CustomEvent('app-toast', { 
                      detail: { message: `[시스템 알림] ${cmd.payload.message}`, type: 'info' } 
                    }));
                  }
                  else if (cmd.type === 'sound') new Audio(cmd.payload.sound).play().catch(e => console.warn(e));
                }
              }
            });
          }, (error) => { console.error("Commands Listener Error:", error.message); }
        );

        unsubConfig = onSnapshot(doc(db, "system", "config"), (doc) => {
          if (doc.exists()) setSystemConfig(doc.data() as SystemConfig);
        }, (error) => { console.error("Config Listener Error:", error.message); });

        unsubTimer = onSnapshot(doc(db, "system", "timer"), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSystemTimer({ endTime: data.endTime, active: data.active });
          }
        }, (error) => { console.error("Timer Listener Error:", error.message); });

        unsubEvents = onSnapshot(doc(db, "system", "events"), (snap) => {
           if (snap.exists()) setSystemEvents({ id: snap.id, ...snap.data() });
        }, (error) => { console.error("Events Listener Error:", error.message); });

      } else {
        setProfile(null);
        setAllStudents([]);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      [unsubProfile, unsubCommands, unsubConfig, unsubTimer, unsubEvents, unsubStudents].forEach(unsub => unsub?.());
    };
  }, []);

  // Automation: Auto-Debuff (Panic State)
  useEffect(() => {
    if (!profile) return;
    
    const checkPanic = async () => {
      if (profile.stress >= 100 && !profile.isCardFrozen) {
        try {
          await updateDoc(doc(db, "users", profile.uid), {
            isCardFrozen: true,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to freeze card:", e);
        }
      }
    };
    
    checkPanic();
  }, [profile?.stress, profile?.isCardFrozen, profile?.uid]);

  // [신규] 활동 기록
  const logActivityFn = async (actionType: string, description: string, severity: 'info'|'warning'|'danger' = 'info') => {
    if (!user || !profile) return;
    await logActivity(user.uid, profile.name, actionType, description, severity);
  };

  // [신규: 자동화 로직 - 루프 종료(시스템 currentLoop 증가) 시 스탯 평균화 및 송금, 스트레스 초기화 등 처리]
  const [prevLoop, setPrevLoop] = useState<number | null>(null);
  useEffect(() => {
    if (!systemConfig?.currentLoop) return;
    if (prevLoop === null) {
      setPrevLoop(systemConfig.currentLoop);
      return;
    }
    
    if (systemConfig.currentLoop > prevLoop) {
      const newLoop = systemConfig.currentLoop;
      setPrevLoop(newLoop);
      
      const handleLoopEnd = async () => {
        try {
          const batch = writeBatch(db);
          
          // 전체 플레이어 스트레스 초기화
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.docs.forEach(userDoc => {
            if (!userDoc.data().isAdmin) {
              batch.update(userDoc.ref, {
                stress: 0,
                updatedAt: serverTimestamp()
              });
            }
          });
          
          // mirror 관계 스탯 평균화
          const mirrorSnap = await getDocs(
            query(collection(db, 'relationships'), 
            where('type', '==', 'mirror'), 
            where('status', '==', 'active'))
          );
          mirrorSnap.docs.forEach(rel => {
             const data = rel.data();
             const p1 = usersSnap.docs.find(d => d.id === data.initiatorUid)?.data();
             const p2 = usersSnap.docs.find(d => d.id === data.targetUid)?.data();
             if (p1 && p2) {
                const terms = ['academicAchievement', 'physical', 'bonding', 'rebellion', 'stamina'];
                const p1Update: any = { updatedAt: serverTimestamp() };
                const p2Update: any = { updatedAt: serverTimestamp() };
                terms.forEach(term => {
                   const avg = Math.floor(((p1[term as keyof UserProfile] as number || 0) + (p2[term as keyof UserProfile] as number || 0)) / 2);
                   p1Update[term] = avg;
                   p2Update[term] = avg;
                });
                batch.update(doc(db, 'users', data.initiatorUid), p1Update);
                batch.update(doc(db, 'users', data.targetUid), p2Update);
             }
          });
          
          // debt 관계 자동 송금
          const debtSnap = await getDocs(
            query(collection(db, 'relationships'),
            where('type', '==', 'debt'),
            where('status', '==', 'active'))
          );
          debtSnap.docs.forEach(rel => {
            const data = rel.data();
            batch.update(doc(db, 'users', data.initiatorUid), { 
              balance: increment(500),
              updatedAt: serverTimestamp()
            });
            batch.update(doc(db, 'users', data.targetUid), {
              stress: increment(5),
              updatedAt: serverTimestamp()
            });
          });

          // benefactor 관계 자동 송금
          const benefactorSnap = await getDocs(
            query(collection(db, 'relationships'),
            where('type', '==', 'benefactor'),
            where('status', '==', 'active'))
          );
          benefactorSnap.docs.forEach(rel => {
            const data = rel.data();
            batch.update(doc(db, 'users', data.initiatorUid), {
               balance: increment(200),
               updatedAt: serverTimestamp()
            });
          });

          // paranoia 관계 누적
          const paranoiaSnap = await getDocs(
            query(collection(db, 'relationships'),
            where('type', '==', 'paranoia'),
            where('status', '==', 'active'))
          );
          paranoiaSnap.docs.forEach(rel => {
            const data = rel.data();
            batch.update(doc(db, 'users', data.initiatorUid), {
              stress: increment(5),
              updatedAt: serverTimestamp()
            });
          });

          // 유언 전달 자동 공개
          const willsToDeliver = await getDocs(
            query(collection(db, 'wills'),
            where('deliverAtLoop', '==', newLoop),
            where('isDelivered', '==', false))
          );
          willsToDeliver.docs.forEach(wDoc => {
             batch.update(wDoc.ref, { isDelivered: true });
          });

          await batch.commit();
        } catch(e) {
          console.error("Loop End Logic Error:", e);
        }
      };

      // Only run this master logic if user is Admin, to prevent multiple clients from applying it
      if (isAdmin) {
         handleLoopEnd();
      }
    }
  }, [systemConfig?.currentLoop, isAdmin]);

  // [신규: 자동화 로직 - 편지 시스템 타이머 확인 (클라이언트 사이드)]
  useEffect(() => {
    if (!isAdmin) return; // 마스터만 백그라운드 체크 실행 (중복 방지)
    
    const checkLetters = async () => {
      try {
        const now = new Date();
        const pending = await getDocs(
          query(collection(db, 'letters'),
          where('isDelivered', '==', false),
          where('deliverAt', '<=', now))
        );
        if (pending.empty) return;
        
        const batch = writeBatch(db);
        pending.docs.forEach(d => batch.update(d.ref, { isDelivered: true }));
        await batch.commit();
      } catch (e) {
        console.error("Letter Check Error:", e);
      }
    };

    const intervalId = setInterval(checkLetters, 60000); // 1분
    return () => clearInterval(intervalId);
  }, [isAdmin]);

  const createInitialProfile = async (u: User) => {
    const userRef = doc(db, 'users', u.uid);
    const secureCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    const newProfile: UserProfile = {
      uid: u.uid,
      email: u.email || '',
      name: u.displayName || '익명의 학생',
      studentId: generateStudentId(),
      academicAchievement: 10,
      attendanceDays: 1,
      memoryPoints: 0,
      stamina: 100,
      balance: 50000,
      trauma: 0,
      loops: 1,
      bonding: 0,
      rebellion: 0,
      physical: 50,
      stress: 0,
      penaltyPoints: 0,
      inventory: [],
      badges: [],
      secureCode: secureCode,
      photoURL: u.photoURL || '',
      emailVerified: u.emailVerified,
      approvalStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(userRef, newProfile);

    // Welcome message from Teacher
    const roomId = ['teacher_admin', u.uid].sort().join('_');
    await setDoc(doc(db, 'rooms', roomId), {
      participants: ['teacher_admin', u.uid],
      updatedAt: serverTimestamp(),
      lastMessage: '명원고등학교 학생 포털에 오신 것을 환영합니다.'
    });
    
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    await addDoc(messagesRef, {
      senderId: 'teacher_admin',
      text: `${u.displayName || '학생'}님, 반가워요. 명원고등학교 학생 포털(원 포털)에 등록되었습니다. 여기서 학급 공지사항과 시간표, 출결 상황을 확인할 수 있으니 자주 들여다보도록 하세요.`,
      createdAt: serverTimestamp()
    });
  };

  // [R1] Hook Delegation
  const updateAcademicProgress = (amount: number) => {
    if (!user || !profile) return Promise.resolve();
    return playerActions.updateAcademicProgress(user.uid, profile.academicAchievement, amount);
  };

  const updateAttendance = (amount: number) => {
    if (!user || !profile) return Promise.resolve();
    return playerActions.updateAttendance(user.uid, profile.attendanceDays, amount);
  };

  const updateStamina = (amount: number) => {
    if (!user || !profile) return Promise.resolve();
    return playerActions.updateStamina(user.uid, profile.stamina, amount);
  };

  const updateProfilePhoto = (url: string) => {
    if (!user) return Promise.resolve();
    return playerActions.updateProfilePhoto(user.uid, url);
  };

  const updateFavorites = (apps: string[]) => {
    if (!user) return Promise.resolve();
    return playerActions.updateFavorites(user.uid, apps);
  };

  const setActiveView = (view: string) => {
    if (!user) return Promise.resolve();
    return playerActions.setActiveView(user.uid, view);
  };

  const consumeItem = (itemName: string, cost: number, staminaGain: number) => {
    if (!user) return Promise.resolve();
    return inventory.consumeItem(user.uid, itemName, cost, staminaGain);
  };

  const sendGift = async (targetUid: string, itemName: string) => {
    // 1분 쿨다운 체크
    if (user && profile) {
      const rateCheck = await checkRateLimit(user.uid, profile.name, 'gift_send', 'cooldown', 60000);
      if (!rateCheck.allowed) {
        return Promise.reject(new Error("1분 내에 연속으로 선물/송금할 수 없습니다. 잠시 후 다시 시도해주세요."));
      }
    }
    return inventory.sendGift(targetUid, itemName);
  };

  const sendMessage = async (recipientId: string, text: string) => {
    if (!user || !profile) return;
    
    // 편지(메시지) 1분 1회 쿨다운 체크
    const rateCheck = await checkRateLimit(user.uid, profile.name, 'message_send', 'cooldown', 60000);
    if (!rateCheck.allowed) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: rateCheck.message, type: "warning" } }));
      return Promise.reject(new Error("cooldown"));
    }

    const roomId = recipientId === 'group_teacher' 
      ? 'group_teacher' 
      : [user.uid, recipientId].sort().join('_');
    
    await setDoc(doc(db, 'rooms', roomId), {
      participants: recipientId === 'group_teacher' ? [] : [user.uid, recipientId],
      updatedAt: serverTimestamp(),
      lastMessage: text
    }, { merge: true });

    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      senderId: user.uid,
      text,
      createdAt: serverTimestamp()
    });
    
    await logActivityFn('MESSAGE', `메시지 발송: ${recipientId}`, 'info');
  };

  const transferWon = async (targetLast4: string, amount: number, memo: string) => {
    if (!user || !profile) return Promise.resolve();
    const rateCheck = await checkRateLimit(user.uid, profile.name, 'money_transfer', 'cooldown', 60000);
    if (!rateCheck.allowed) {
      throw new Error("1분 내에 연속으로 송금/선물할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    await transfer.transferWon(user.uid, profile.name, profile.balance, targetLast4, amount, memo, logs.addSystemLog);
    await logActivityFn('TRANSFER', `${targetLast4}에게 ${amount}원 송금`, amount > 10000 ? 'warning' : 'info');
  };

  const sendMoney = async (targetUid: string, amount: number, memo: string = '') => {
    if (!user || !profile) return Promise.resolve();
    const rateCheck = await checkRateLimit(user.uid, profile.name, 'money_transfer', 'cooldown', 60000);
    if (!rateCheck.allowed) {
      throw new Error("1분 내에 연속으로 송금/선물할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    await transfer.sendMoney(user.uid, profile.name, profile.balance, targetUid, amount, memo);
    await logActivityFn('TRANSFER_UID', `${targetUid}에게 ${amount}원 송금`, amount > 10000 ? 'warning' : 'info');
  };

  const checkIn = async (locationId: string) => {
    if (!user || !profile) return;
    const lastAt = profile.lastCheckIn?.at?.toDate?.();
    if (lastAt) {
      const today = new Date();
      const isSameDay =
        lastAt.getFullYear() === today.getFullYear() &&
        lastAt.getMonth() === today.getMonth() &&
        lastAt.getDate() === today.getDate();
      if (isSameDay) {
        throw new Error('오늘은 이미 체크인했습니다.');
      }
    }
    
    // Find location name
    const { ALL_MAP_AREAS } = await import('../constants/mapData');
    const area = ALL_MAP_AREAS.find(a => a.id === locationId);
    const locationName = area?.name || locationId;

    // [신규] 가용성 체크
    if (area) {
       const { getRoomAvailability } = await import('../lib/spacialAvailability');
       
       // 현재 인원 파악 (room_status 스냅샷이 이미 컨텍스트에 있거나 새로 가져와야 함)
       // 여기서는 간단하게 profile.allStudents (이미 구독중)에서 현재 위치한 인원수를 파악할 수도 있지만,
       // room_status가 더 정확함. 일단 room_status 문서 fetch.
       const roomRef = doc(db, 'room_status', locationId);
       const roomSnap = await getDoc(roomRef);
       const currentOccupancy = roomSnap.exists() ? (roomSnap.data().presentPlayers?.length || 0) : 0;
       
       const availability = getRoomAvailability(area, profile, currentOccupancy);
       if (!availability.isAvailable) {
         throw new Error(availability.reason || '현재 이 구역은 이용할 수 없습니다.');
       }
    }
    
    try {
      const { Timestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', user.uid), {
        lastCheckIn: { locationId, at: serverTimestamp() },
        checkInHistory: arrayUnion({
          locationId,
          locationName,
          loopIndex: profile.loops ?? 0,
          at: new Date().toISOString() // [C]
        }),
        balance: increment(50),
        memoryPoints: increment(50),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'event_logs'), {
        uid: user.uid,
        type: 'action',
        description: `${locationName}에 체크인했습니다.`,
        descriptionMasked: `${locationName}에 도착을 확인했습니다.`,
        loopIndex: systemConfig?.currentLoop || 1,
        createdAt: serverTimestamp()
      });

      await logs.addSystemLog(`USER_${user.uid.slice(0,4)} CHECKED_IN @ ${locationId}`);
    } catch (e: any) {
      console.error('[checkIn] failed:', e);
      throw e;
    }
  };

  const addSystemLog = (log: string) => {
    return logs.addSystemLog(log);
  };

  const interactWithStudent = (targetUid: string, action: InteractionAction) => {
    if (!user || !profile) throw new Error('Authentication required');
    return interactions.interactWithStudent(user.uid, profile, targetUid, action, logs.addSystemLog);
  };

  const getUiText = (key: string, defaultText: string) => {
    if (!profile || !profile.uiTextOverrides) return defaultText;
    try {
      if (typeof profile.uiTextOverrides === 'string') {
          const overrides = JSON.parse(profile.uiTextOverrides);
          return overrides[key] || defaultText;
      } else {
        return (profile.uiTextOverrides as any)[key] || defaultText;
      }
    } catch(e) {
        return defaultText;
    }
  };

  const isMenuBlocked = (menuId: string) => {
    if (menuId === 'manitto') {
      return !systemConfig?.manittoEnabled;
    }
    if (!profile || !profile.blockedMenus) return false;
    return profile.blockedMenus.includes(menuId);
  };

  return (
    <GameContext.Provider value={{ 
      user, 
      profile, 
      allStudents,
      loading, 
      isAdmin,
      gameState,
      updateAcademicProgress,
      updateAttendance,
      updateStamina,
      updateProfilePhoto,
      consumeItem,
      sendMessage,
      transferWon,
      sendMoney,
      sendGift,
      checkIn,
      addSystemLog,
      interactWithStudent,
      updateFavorites,
      setActiveView,
      getUiText,
      isMenuBlocked,
      logActivity: logActivityFn,
      systemConfig,
      systemTimer,
      systemEvents,
      canCheckInToday,
      lastCheckInLocation
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
