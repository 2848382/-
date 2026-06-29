import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const useSystemLog = () => {
  const addSystemLog = async (log: string) => {
    try {
      const configRef = doc(db, 'system', 'config');
      await updateDoc(configRef, {
        logs: arrayUnion(`[${new Date().toLocaleTimeString()}] ${log}`)
      });
    } catch (e) {
      console.warn("[useSystemLog] Log update failed:", e);
    }
  };

  return { addSystemLog };
};
