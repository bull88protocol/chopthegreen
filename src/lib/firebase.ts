import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, initializeAuth, signInWithCredential, GoogleAuthProvider,
  // @ts-expect-error -- exported at runtime, missing from the JS SDK's types.
  getReactNativePersistence,
  type Auth, type User,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { firebaseConfig, syncEnabled } from './appConfig';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/** Lazily boot Firebase; returns null when sync isn't configured. */
export function ensureFirebase(): { auth: Auth; db: Firestore } | null {
  if (!syncEnabled) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    try {
      // Persist the session so users aren't signed out on every cold start.
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      // initializeAuth throws if it already ran (fast refresh, re-entry).
      auth = getAuth(app);
    }
    db = getFirestore(app);
  }
  return auth && db ? { auth, db } : null;
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User | null> {
  const fb = ensureFirebase();
  if (!fb) return null;
  const cred = GoogleAuthProvider.credential(idToken);
  const res = await signInWithCredential(fb.auth, cred);
  return res.user;
}

/** One document per user holds the whole synced payload — it's tiny. */
export const userDoc = (uid: string) => {
  const fb = ensureFirebase();
  return fb ? doc(fb.db, 'users', uid) : null;
};

export { getDoc, setDoc };
export type { User };
