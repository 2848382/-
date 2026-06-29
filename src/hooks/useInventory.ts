import { db } from '../lib/firebase';
import { doc, runTransaction, increment, serverTimestamp, arrayUnion, collection, addDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export const useInventory = () => {
  const consumeItem = async (uid: string, itemName: string, cost: number, staminaGain: number) => {
    const userRef = doc(db, 'users', uid);
    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User does not exist');
        
        const userData = userDoc.data() as UserProfile;
        const currentBalance = userData.balance || 0;
        
        if (currentBalance < cost) {
          throw new Error('잔액이 부족합니다.');
        }
        
        transaction.update(userRef, {
          balance: increment(-cost),
          stamina: increment(staminaGain),
          inventory: arrayUnion(itemName),
          updatedAt: serverTimestamp()
        });
      });

      // Log transaction
      await addDoc(collection(db, 'users', uid, 'transactions'), {
        type: 'spend',
        amount: cost,
        toFrom: '매점/자판기',
        memo: `${itemName} 구매`,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
    }
  };

  const sendGift = async (targetUid: string, itemName: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { 
        bonding: increment(10),
        inventory: arrayUnion(`Gift: ${itemName}`),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  return { consumeItem, sendGift };
};
