import { db } from '../lib/firebase';
import { doc, writeBatch, serverTimestamp, increment, collection } from 'firebase/firestore';
import { InteractionAction, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export const useInteraction = () => {
  const interactWithStudent = async (
    userUid: string, 
    profile: UserProfile, 
    targetUid: string, 
    action: InteractionAction,
    addSystemLog: (log: string) => void
  ) => {
    if (targetUid === userUid) throw new Error('Cannot interact with self');

    // Check Costs
    if (action.cost) {
      if (action.cost.balance && (profile.balance || 0) < action.cost.balance) throw new Error('잔액이 부족합니다.');
      if (action.cost.stamina && (profile.stamina || 0) < action.cost.stamina) throw new Error('스테미나가 부족합니다.');
      if (action.cost.stress && (profile.stress || 0) < action.cost.stress) throw new Error('스트레스가 너무 낮아 이 행동을 할 수 없습니다.');
    }

    try {
      const batch = writeBatch(db);
      const selfRef = doc(db, 'users', userUid);
      const targetRef = doc(db, 'users', targetUid);

      // Self Update
      const selfUpdate: any = { updatedAt: serverTimestamp() };
      Object.entries(action.effect.self).forEach(([key, val]) => {
        if (typeof val === 'number') selfUpdate[key] = increment(val);
      });
      if (action.cost) {
        if (action.cost.balance) selfUpdate.balance = increment(-action.cost.balance);
        if (action.cost.stamina) selfUpdate.stamina = increment(-action.cost.stamina);
        if (action.cost.stress) selfUpdate.stress = increment(-action.cost.stress);
      }
      batch.update(selfRef, selfUpdate);

      // Target Update
      const targetUpdate: any = { updatedAt: serverTimestamp() };
      Object.entries(action.effect.target).forEach(([key, val]) => {
        if (typeof val === 'number') targetUpdate[key] = increment(val);
      });
      batch.update(targetRef, targetUpdate);

      // Handle Transactions
      if (action.cost?.balance) {
        batch.set(doc(collection(db, 'users', userUid, 'transactions')), {
          amount: -action.cost.balance,
          type: 'spend',
          toFrom: '학생 상호작용',
          memo: action.label,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      addSystemLog(`ACTION: ${profile.name} applied ${action.id} to TARGET_${targetUid.slice(0,4)}`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userUid}`);
    }
  };

  return { interactWithStudent };
};
