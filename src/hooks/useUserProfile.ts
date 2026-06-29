import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, increment, serverTimestamp } from 'firebase/firestore';

export function useUserProfile() {
  const { user, profile } = useGame();
  
  const statsEditCount = profile?.statsEditCount || 0;
  const canEditStats = statsEditCount < 3;
  
  const updateProfileData = async (data: any, isInitial: boolean = false) => {
    if (!user || !profile) return false;
    
    if (!canEditStats && !isInitial) {
       return false; // Not allowed to edit anymore
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...data,
        updatedAt: serverTimestamp(),
        // If it's 0 or undefined, make it 1 on the first save (onboarding or manual).
        // Otherwise, increment if it's not the initial onboarding.
        statsEditCount: (profile.statsEditCount || 0) === 0 ? 1 : (isInitial ? profile.statsEditCount : increment(1))
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return {
    profile,
    statsEditCount,
    canEditStats,
    updateProfileData
  };
}
