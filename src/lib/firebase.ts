import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Using initializeFirestore with settings to handle potential network issues in some environments.
// The databaseId is passed as the third argument in the JS SDK.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

// [Disabled offline persistence to avoid connection hangs]
// enableIndexedDbPersistence(db).catch(...)

export const auth = getAuth(app);

async function testConnection() {
  try {
    // Try to reach a public path or just verify the SDK can talk to the backend.
    // If it's the first time, this might naturally fail if no data exists, but we want to check for TIMEOUTS or UNAVAILABLE.
    await getDocFromServer(doc(db, 'system', 'heartbeat'));
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('respond')) {
      console.warn("Firestore connection check: Backend unreachable. This typically indicates network issues or proxy blocking.");
    }
  }
}
testConnection();
