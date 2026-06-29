import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export const usePlayerActions = () => {
  const updateAcademicProgress = async (uid: string, current: number, amount: number) => {
    const newValue = Math.max(0, Math.min(100, (current || 0) + amount));
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        academicAchievement: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const updateAttendance = async (uid: string, current: number, amount: number) => {
    const newValue = Math.max(1, (current || 0) + amount);
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        attendanceDays: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const updateStamina = async (uid: string, current: number, amount: number) => {
    const newValue = Math.max(0, Math.min(100, (current ?? 100) + amount));
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        stamina: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const updateProfilePhoto = async (uid: string, url: string) => {
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        photoURL: url,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const updateFavorites = async (uid: string, apps: string[]) => {
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        favoriteApps: apps,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const setActiveView = async (uid: string, view: string) => {
    const pathRef = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeView: view,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  return {
    updateAcademicProgress,
    updateAttendance,
    updateStamina,
    updateProfilePhoto,
    updateFavorites,
    setActiveView
  };
};
