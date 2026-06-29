import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export const useTransfer = () => {
  const transferWon = async (
    senderUid: string, 
    senderName: string, 
    senderBalance: number,
    targetLast4: string, 
    amount: number, 
    memo: string,
    addSystemLog: (log: string) => void
  ) => {
    if (amount <= 0 || senderBalance < amount) {
      throw new Error('잔액이 부족하거나 유효하지 않은 입력입니다.');
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const targetDoc = querySnapshot.docs.find(doc => {
        const sid = doc.data().studentId || '';
        return sid.endsWith(targetLast4);
      });

      if (!targetDoc) throw new Error('학생을 찾을 수 없습니다 (학번 끝 4자리 확인 요망).');
      const targetData = targetDoc.data();
      if (targetDoc.id === senderUid) throw new Error('자기 자신에게는 보낼 수 없습니다.');

      const batch = writeBatch(db);
      
      // 1. Update Sender
      const senderRef = doc(db, 'users', senderUid);
      batch.update(senderRef, { 
        balance: increment(-amount),
        updatedAt: serverTimestamp()
      });
      
      const senderTxRef = doc(collection(db, 'users', senderUid, 'transactions'));
      batch.set(senderTxRef, {
        amount: -amount,
        type: 'spend',
        toFrom: targetData.name,
        memo: memo || `송금: ${targetData.name}`,
        balanceAfter: senderBalance - amount,
        createdAt: serverTimestamp()
      });

      // 2. Update Receiver
      const receiverRef = doc(db, 'users', targetDoc.id);
      batch.update(receiverRef, { 
        balance: increment(amount),
        bonding: increment(5),
        updatedAt: serverTimestamp()
      });

      const receiverTxRef = doc(collection(db, 'users', targetDoc.id, 'transactions'));
      batch.set(receiverTxRef, {
        amount: amount,
        type: 'receive',
        toFrom: senderName,
        memo: memo || `입금: ${senderName}`,
        balanceAfter: (targetData.balance || 0) + amount,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      addSystemLog(`TRANSFER: ${senderName} -> ${targetData.name} [${amount}원]`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${senderUid}`);
    }
  };

  const sendMoney = async (
    senderUid: string,
    senderName: string,
    senderBalance: number,
    targetUid: string, 
    amount: number, 
    memo: string = ''
  ) => {
    if (amount <= 0 || senderBalance < amount) {
      throw new Error('잔액이 부족하거나 유효하지 않은 입력입니다.');
    }

    try {
      const targetRef = doc(db, 'users', targetUid);
      // We don't fetch targetDoc here to save a read, but we might need its name for logs. 
      // In the original code it was fetched. Let's keep it for consistency.
      const querySnapshot = await getDocs(query(collection(db, 'users')));
      const targetDoc = querySnapshot.docs.find(d => d.id === targetUid);
      if (!targetDoc) throw new Error('Recipient not found');
      const targetData = targetDoc.data();

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', senderUid), { 
        balance: increment(-amount),
        updatedAt: serverTimestamp()
      });
      batch.set(doc(collection(db, 'users', senderUid, 'transactions')), {
        amount: -amount,
        type: 'spend',
        toFrom: targetData.name,
        memo: memo || `송금: ${targetData.name}`,
        balanceAfter: senderBalance - amount,
        createdAt: serverTimestamp()
      });

      batch.update(targetRef, { 
        balance: increment(amount),
        bonding: increment(5),
        updatedAt: serverTimestamp()
      });
      batch.set(doc(collection(db, 'users', targetUid, 'transactions')), {
        amount: amount,
        type: 'receive',
        toFrom: senderName,
        memo: memo || `입금: ${senderName}`,
        balanceAfter: (targetData.balance || 0) + amount,
        createdAt: serverTimestamp()
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${senderUid}`);
    }
  };

  return { transferWon, sendMoney };
};
