import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Severity = 'info' | 'warning' | 'danger';

export const logActivity = async (
  actorUid: string,
  actorName: string,
  actionType: string,
  message: string,
  severity: Severity = 'info',
  metadata?: Record<string, unknown>
) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      actorUid,
      actorName: actorName || 'Unknown',
      actionType,
      message,
      severity,
      metadata: metadata || null,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
};
