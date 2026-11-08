/**
 * Firebase browser configuration and lazily loaded modular SDK.
 *
 * Firebase web configuration values are public client identifiers, not secrets.
 * Firestore Security Rules are the authorization boundary. Never place service
 * account credentials or Admin SDK keys in VITE_ variables.
 */
export const FIREBASE_CDN_VERSION = '13.2.0';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

function isRealConfigurationValue(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 &&
    !/^(?:YOUR_|MY_|REPLACE_ME|CHANGEME)/i.test(normalized);
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(isRealConfigurationValue);

export interface FirebaseServices {
  app: any;
  auth: any;
  db: any;
  authApi: any;
  firestoreApi: any;
}

let servicePromise: Promise<FirebaseServices> | null = null;

export async function getFirebaseServices(): Promise<FirebaseServices> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Continue as Demo Guest or configure the Firebase web app settings.');
  }

  if (!servicePromise) {
    servicePromise = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}`;
      const [appApi, authApi, firestoreApi] = await Promise.all([
        import(/* @vite-ignore */ `${base}/firebase-app.js`),
        import(/* @vite-ignore */ `${base}/firebase-auth.js`),
        import(/* @vite-ignore */ `${base}/firebase-firestore.js`),
      ]);

      const app = appApi.getApps().length > 0
        ? appApi.getApp()
        : appApi.initializeApp(firebaseConfig);

      return {
        app,
        auth: authApi.getAuth(app),
        db: firestoreApi.getFirestore(app),
        authApi,
        firestoreApi,
      };
    })().catch((error) => {
      servicePromise = null;
      throw error;
    });
  }

  return servicePromise;
}
