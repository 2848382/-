import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useFirestoreConnection(): 'connected' | 'connecting' | 'offline' {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'heartbeat'),
      () => setStatus('connected'),
      () => setStatus('offline')
    );
    return () => unsub();
  }, []);
  
  return status;
}
