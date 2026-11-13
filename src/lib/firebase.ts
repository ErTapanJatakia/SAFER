import {getApp, getApps, initializeApp, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';

/**
 * Public Firebase web configuration. These values are not secrets.
 * Authorisation must be enforced by Firebase Authentication and Security Rules.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig)
  .every((value) => typeof value === 'string' && value.trim().length > 0);

/**
 * Firebase remains optional at build/runtime so deployments without credentials
 * can still use the isolated synthetic Demo Guest experience.
 */
export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

/**
 * Uses the default Firestore database when configured. No Firestore reads or
 * writes are performed by the authentication gate in this implementation.
 */
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
