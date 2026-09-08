/**
 * Cloud sync configuration.
 *
 * Sync is entirely optional: with no values here the app behaves exactly as
 * it always has — everything saved on-device, no accounts, no network beyond
 * fetching recipes. The account UI simply doesn't appear. That keeps a fresh
 * clone runnable and means a misconfiguration can never break cooking.
 *
 * To switch it on, fill these in from your Firebase project
 * (see SYNC-SETUP.md) or supply them via app.json -> expo.extra.
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

export const firebaseConfig = {
  apiKey: extra.firebaseApiKey ?? '',
  authDomain: extra.firebaseAuthDomain ?? '',
  projectId: extra.firebaseProjectId ?? '',
  storageBucket: extra.firebaseStorageBucket ?? '',
  messagingSenderId: extra.firebaseMessagingSenderId ?? '',
  appId: extra.firebaseAppId ?? '',
};

/** OAuth 2.0 **Web** client ID from the same Firebase/Google Cloud project. */
export const googleWebClientId: string = extra.googleWebClientId ?? '';

/** True only when every value needed for sign-in is present. */
export const syncEnabled =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId) &&
  Boolean(googleWebClientId);
