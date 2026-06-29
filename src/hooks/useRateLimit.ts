import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../services/activityLogService';

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

export const checkRateLimit = async (
  uid: string,
  userName: string,
  actionType: string,
  limitType: 'cooldown' | 'daily',
  amount: number // milliseconds for cooldown, count for daily
): Promise<RateLimitResult> => {
  const docId = `${uid}_${actionType}`;
  const docRef = doc(db, 'rate_limits', docId);
  try {
    const snap = await getDoc(docRef);
    const now = Date.now();
    const today = new Date().toDateString();

    if (snap.exists()) {
      const data = snap.data();
      if (limitType === 'cooldown') {
        const lastUsedAt = data.lastUsedAt?.toMillis() || 0;
        const elapsed = now - lastUsedAt;
        if (elapsed < amount) {
          const remainingSec = Math.ceil((amount - elapsed) / 1000);
          const min = Math.floor(remainingSec / 60);
          const sec = remainingSec % 60;
          const msg = `아직 ${min > 0 ? `${min}분 ` : ''}${sec}초 후 다시 시도할 수 있습니다.`;
          
          await logActivity(uid, userName, 'rate_limit_hit', `${actionType} 쿨타임 제한 걸림`, 'warning');
          return { allowed: false, message: msg };
        }
      } else if (limitType === 'daily') {
        const dateKey = data.dateKey;
        const count = dateKey === today ? (data.countToday || 0) : 0;
        if (count >= amount) {
          await logActivity(uid, userName, 'rate_limit_hit', `${actionType} 일일 제한 걸림`, 'warning');
          return { allowed: false, message: `하루 최대 ${amount}회까지만 가능합니다.` };
        }
      }
    }

    // Update rate limit
    let updateData: any = {
      uid,
      actionType,
      lastUsedAt: serverTimestamp()
    };
    if (limitType === 'daily') {
      const data = snap.exists() ? snap.data() : {};
      const count = data.dateKey === today ? (data.countToday || 0) : 0;
      updateData.dateKey = today;
      updateData.countToday = count + 1;
    }
    await setDoc(docRef, updateData, { merge: true });
    return { allowed: true };

  } catch (err) {
    console.warn("Rate limit check failed, allowing by default", err);
    return { allowed: true };
  }
};
