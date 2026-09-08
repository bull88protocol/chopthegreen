import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { googleWebClientId, syncEnabled } from '../lib/appConfig';
import {
  ensureFirebase, getDoc, setDoc, signInWithGoogleIdToken, userDoc, type User,
} from '../lib/firebase';
import { reconcile, type SyncState } from '../lib/merge';
import { useUser } from './user';

const K_LINKED = 'ctg.linkedOnce.v1';

export type SyncStatus = 'off' | 'signedOut' | 'working' | 'synced' | 'error';

type Value = {
  /** False when the build has no Firebase config; the UI hides sync entirely. */
  available: boolean;
  user: { uid: string; name: string | null; email: string | null; photo: string | null } | null;
  status: SyncStatus;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, snapshot, applyRemote, updatedAt } = useUser();
  const [user, setUser] = useState<Value['user']>(null);
  const [status, setStatus] = useState<SyncStatus>(syncEnabled ? 'signedOut' : 'off');
  const [error, setError] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef(0);

  useEffect(() => {
    if (!syncEnabled) return;
    GoogleSignin.configure({ webClientId: googleWebClientId, offlineAccess: false });
    const fb = ensureFirebase();
    if (!fb) return;
    // Restores a persisted session on cold start.
    return fb.auth.onAuthStateChanged((u: User | null) => {
      setUser(u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null);
      setStatus(u ? 'working' : 'signedOut');
    });
  }, []);

  /** Pull the remote doc, reconcile against local, write the result back. */
  const pull = useCallback(async (uid: string) => {
    const ref = userDoc(uid);
    if (!ref) return;
    setStatus('working');
    try {
      const snap = await getDoc(ref);
      const remote = snap.exists() ? (snap.data() as SyncState) : null;
      const linkedBefore = (await AsyncStorage.getItem(K_LINKED)) === uid;
      const merged = reconcile(snapshot(), remote, !linkedBefore);
      applyRemote(merged);
      await setDoc(ref, merged);
      lastPushed.current = merged.updatedAt;
      await AsyncStorage.setItem(K_LINKED, uid);
      setStatus('synced');
      setError(null);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Sync failed');
    }
  }, [snapshot, applyRemote]);

  // Reconcile once the account and local data are both ready.
  useEffect(() => {
    if (user && ready) void pull(user.uid);
    // Only re-run when the account changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, ready]);

  // Push local edits up, debounced so a burst of taps is one write.
  useEffect(() => {
    if (!user || status === 'working' || !ready) return;
    if (updatedAt <= lastPushed.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      const ref = userDoc(user.uid);
      if (!ref) return;
      const payload = snapshot();
      setDoc(ref, payload)
        .then(() => { lastPushed.current = payload.updatedAt; setStatus('synced'); })
        .catch((e) => { setStatus('error'); setError(e?.message ?? 'Sync failed'); });
    }, 1500);
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [updatedAt, user, ready, status, snapshot]);

  const signIn = useCallback(async () => {
    if (!syncEnabled) return;
    setError(null);
    setStatus('working');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await GoogleSignin.signIn();
      // v13+ returns { type, data }; older returns the user object directly.
      const idToken = res?.data?.idToken ?? res?.idToken;
      if (!idToken) {
        // A cancelled picker lands here too — not an error worth showing.
        setStatus(user ? 'synced' : 'signedOut');
        return;
      }
      await signInWithGoogleIdToken(idToken);
      // onAuthStateChanged drives the rest.
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        setStatus(user ? 'synced' : 'signedOut');
        return;
      }
      setStatus('error');
      setError(e?.message ?? 'Could not sign in');
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut().catch(() => {});
      const fb = ensureFirebase();
      await fb?.auth.signOut();
    } finally {
      // Local data deliberately stays put: signing out shouldn't wipe a
      // shopping list someone is standing in a shop with.
      setUser(null);
      setStatus(syncEnabled ? 'signedOut' : 'off');
    }
  }, []);

  const value = useMemo<Value>(
    () => ({ available: syncEnabled, user, status, error, signIn, signOut }),
    [user, status, error, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
