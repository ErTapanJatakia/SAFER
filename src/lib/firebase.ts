import {getApp, getApps, initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

/**
 * Public Firebase web configuration.
 *
 * Values are supplied through Vite environment variables. Firebase web config
 * is not a secret; access control must be enforced by Authentication and
 * Firestore Security Rules, never by hiding these client-side values.
 */
const requiredEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(requiredEnv)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Firebase configuration is incomplete. Set the following Vite variables: ${missing.join(', ')}.`,
  );
}

const firebaseConfig = {
  apiKey: requiredEnv.apiKey,
  authDomain: requiredEnv.authDomain,
  projectId: requiredEnv.projectId,
  appId: requiredEnv.appId,
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

/**
 * Uses the project's default Firestore database.
 * No Storage, Analytics, Cloud Functions, or paid services are initialized.
 */
export const db = getFirestore(firebaseApp);
