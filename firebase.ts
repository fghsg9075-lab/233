import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, collection, updateDoc, deleteDoc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { getDatabase, ref, set, get, onValue, update, remove } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- FIREBASE CONFIGURATION (PROVIDED BY USER) ---
const firebaseConfig = {
  apiKey: "AIzaSyDNAarkY9MquMpJzKuXt4BayK6AHGImyr0",
  authDomain: "dec2025-96ecd.firebaseapp.com",
  projectId: "dec2025-96ecd",
  storageBucket: "dec2025-96ecd.firebasestorage.app",
  messagingSenderId: "617035489092",
  appId: "1:617035489092:web:cf470004dfcb97e41cc111",
  // 👇 FIXED: Singapore Location URL (Isse connection sahi ho jayega)
  databaseURL: "https://dec2025-96ecd-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

// --- EXPORTED HELPERS ---

// Helper to remove undefined fields (Firestore doesn't support them)
export const sanitizeForFirestore = (obj: any): any => {
  // Preserve Date objects (Firestore supports them or converts to Timestamp)
  if (obj instanceof Date) {
      return obj;
  }
  
  if (Array.isArray(obj)) {
    // Filter out undefineds from arrays (Firestore rejects arrays with undefined)
    return obj.map(v => sanitizeForFirestore(v)).filter(v => v !== undefined);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = sanitizeForFirestore(obj[key]);
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

export const checkFirebaseConnection = () => {
  return navigator.onLine; 
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// --- DUAL WRITE / SMART READ LOGIC ---

// 1. User Data Sync
export const saveUserToLive = async (user: any) => {
  try {
    if (!user || !user.id) return;
    
    // Sanitize data before saving
    const sanitizedUser = sanitizeForFirestore(user);

    // INDEPENDENT WRITES: One failure should not block the other
    const promises = [];
    
    // 1. RTDB
    promises.push(set(ref(rtdb, `users/${user.id}`), sanitizedUser).catch(e => console.error("RTDB Save Error:", e)));
    
    // 2. Firestore
    promises.push(setDoc(doc(db, "users", user.id), sanitizedUser).catch(e => console.error("Firestore Save Error:", e)));

    await Promise.all(promises);
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  // Prefer Firestore for Admin List (More Reliable)
  const q = collection(db, "users");
  return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      if (users.length > 0) {
          callback(users);
      } else {
          // Fallback to RTDB if Firestore is empty (migration scenario)
          const usersRef = ref(rtdb, 'users');
          onValue(usersRef, (snap) => {
             const data = snap.val();
             const userList = data ? Object.values(data) : [];
             callback(userList);
          }, { onlyOnce: true });
      }
  });
};

export const getUserData = async (userId: string) => {
    try {
        // Try RTDB
        const snap = await get(ref(rtdb, `users/${userId}`));
        if (snap.exists()) return snap.val();
        
        // Try Firestore
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) return docSnap.data();

        return null;
    } catch (e) { console.error(e); return null; }
};

export const getUserByEmail = async (email: string) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data();
        }
        return null; 
    } catch (e) { console.error(e); return null; }
};

// 2. System Settings Sync
export const saveSystemSettings = async (settings: any) => {
  try {
    const sanitizedSettings = sanitizeForFirestore(settings);
    await set(ref(rtdb, 'system_settings'), sanitizedSettings);
    await setDoc(doc(db, "config", "system_settings"), sanitizedSettings);
  } catch (error) {
    console.error("Error saving settings:", error);
  }
};

export const subscribeToSettings = (callback: (settings: any) => void) => {
  // Listen to Firestore
  return onSnapshot(doc(db, "config", "system_settings"), (docSnap) => {
      if (docSnap.exists()) {
          callback(docSnap.data());
      } else {
          // Fallback RTDB
           onValue(ref(rtdb, 'system_settings'), (snap) => {
               const data = snap.val();
               if (data) callback(data);
           }, { onlyOnce: true });
      }
  });
};

// 3. Content Links Sync (Bulk Uploads)
export const bulkSaveLinks = async (updates: Record<string, any>) => {
  try {
    const sanitizedUpdates = sanitizeForFirestore(updates);
    // RTDB
    await update(ref(rtdb, 'content_links'), sanitizedUpdates);
    
    // Firestore - We save each update as a document in 'content_data' collection
    // 'updates' is a map of key -> data
    const batchPromises = Object.entries(sanitizedUpdates).map(async ([key, data]) => {
         await setDoc(doc(db, "content_data", key), data);
    });
    await Promise.all(batchPromises);

  } catch (error) {
    console.error("Error bulk saving links:", error);
  }
};

// 4. Chapter Data Sync (Individual)
export const saveChapterData = async (key: string, data: any) => {
  try {
    const sanitizedData = sanitizeForFirestore(data);
    await set(ref(rtdb, `content_data/${key}`), sanitizedData);
    await setDoc(doc(db, "content_data", key), sanitizedData);
  } catch (error) {
    console.error("Error saving chapter data:", error);
  }
};

export const getChapterData = async (key: string) => {
    try {
        // 1. Try RTDB (Faster)
        const snapshot = await get(ref(rtdb, `content_data/${key}`));
        if (snapshot.exists()) {
            return snapshot.val();
        }
        
        // 2. Fallback to Firestore
        const docSnap = await getDoc(doc(db, "content_data", key));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        
        return null;
    } catch (error) {
        console.error("Error getting chapter data:", error);
        return null;
    }
};

// Used by client to listen for realtime changes to a specific chapter
export const subscribeToChapterData = (key: string, callback: (data: any) => void) => {
    const rtdbRef = ref(rtdb, `content_data/${key}`);
    return onValue(rtdbRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            // If not in RTDB, check Firestore (one-time fetch or snapshot?)
            // For now, let's just do one-time fetch to avoid complexity of double listeners
            getDoc(doc(db, "content_data", key)).then(docSnap => {
                if (docSnap.exists()) callback(docSnap.data());
            });
        }
    });
};


export const saveTestResult = async (userId: string, attempt: any) => {
    try {
        const docId = `${attempt.testId}_${Date.now()}`;
        const sanitizedAttempt = sanitizeForFirestore(attempt);
        await setDoc(doc(db, "users", userId, "test_results", docId), sanitizedAttempt);
    } catch(e) { console.error(e); }
};

export const saveUserHistory = async (userId: string, historyItem: any) => {
    try {
        const docId = `history_${historyItem.id || Date.now()}`;
        const sanitized = sanitizeForFirestore(historyItem);
        // Save to subcollection "history" under the user
        await setDoc(doc(db, "users", userId, "history", docId), sanitized);
    } catch(e) { console.error("Error saving history:", e); }
};

export const updateUserStatus = async (userId: string, time: number) => {
     try {
        const userRef = ref(rtdb, `users/${userId}`);
        await update(userRef, { lastActiveTime: new Date().toISOString() });
    } catch (error) {
    }
};

export { app, db, rtdb, auth };
