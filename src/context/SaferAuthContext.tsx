import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getFirebaseServices,
  isFirebaseConfigured,
  type FirebaseServices,
} from '../lib/firebase.ts';
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_THEME_ID,
} from '../utils/themePresets.ts';

export type SaferRole =
  | 'super_admin'
  | 'org_admin'
  | 'supervisor'
  | 'personnel'
  | 'auditor'
  | 'pending';

export type AccountStatus = 'pending' | 'active' | 'suspended';

export interface SaferProfile {
  uid: string;
  email: string;
  displayName: string;
  role: SaferRole;
  status: AccountStatus;
  organizationId: string | null;
}

export interface PersonalSettings {
  schemaVersion: 1;
  appearance: {
    themeId: string;
    interfaceDensity: 'comfortable' | 'compact';
    textSize: '100' | '125' | '150' | '175' | '200';
  };
  accessibility: typeof DEFAULT_ACCESSIBILITY_SETTINGS;
  notifications: {
    incidentAssignments: boolean;
    taskUpdates: boolean;
    qualificationReminders: boolean;
    accountSecurity: boolean;
  };
  languageRegion: {
    language: 'en';
    dateFormat: 'DD-MM-YYYY' | 'YYYY-MM-DD';
    timeFormat: '24h' | '12h';
    timeZone: string;
  };
}

export const DEFAULT_PERSONAL_SETTINGS: PersonalSettings = {
  schemaVersion: 1,
  appearance: {
    themeId: DEFAULT_THEME_ID,
    interfaceDensity: 'comfortable',
    textSize: '100',
  },
  accessibility: { ...DEFAULT_ACCESSIBILITY_SETTINGS },
  notifications: {
    incidentAssignments: true,
    taskUpdates: true,
    qualificationReminders: true,
    accountSecurity: true,
  },
  languageRegion: {
    language: 'en',
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24h',
    timeZone: 'Asia/Kolkata',
  },
};

interface SaferAuthContextValue {
  configured: boolean;
  loading: boolean;
  user: any | null;
  profile: SaferProfile | null;
  settings: PersonalSettings;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshEmailVerification: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  saveProfile: (displayName: string) => Promise<void>;
  saveSettings: (settings: PersonalSettings) => Promise<void>;
  submitPrivacyRequest: (type: 'access' | 'correction' | 'deletion', details: string) => Promise<void>;
  clearError: () => void;
}

const SaferAuthContext = createContext<SaferAuthContextValue | undefined>(undefined);

function normalizeProfile(data: Record<string, unknown>, uid: string, fallbackEmail: string): SaferProfile {
  const validRoles: SaferRole[] = ['super_admin', 'org_admin', 'supervisor', 'personnel', 'auditor', 'pending'];
  const validStatuses: AccountStatus[] = ['pending', 'active', 'suspended'];
  const role = validRoles.includes(data.role as SaferRole) ? data.role as SaferRole : 'pending';
  const status = validStatuses.includes(data.status as AccountStatus) ? data.status as AccountStatus : 'pending';
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : fallbackEmail,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    role,
    status,
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : null,
  };
}

function normalizeSettings(data: any): PersonalSettings {
  const appearance = data?.appearance ?? {};
  const accessibility = data?.accessibility ?? {};
  const notifications = data?.notifications ?? {};
  const languageRegion = data?.languageRegion ?? {};
  const validThemeIds = [
    'blue-white', 'green-white', 'green-black', 'black-white', 'red-green',
    'multicolour-rgby', 'bright-daylight-desert', 'high-contrast-outdoor',
    'tropical-jungle', 'maritime-coastal', 'mountain-snow', 'night-low-glare',
    'neutral-slate-monochrome', 'warm-earth-sand', 'dark-graphite-amber',
    'camo-woodland', 'camo-naval', 'camo-urban', 'camo-desert', 'camo-tactical-black',
  ];
  const textSizes = ['100', '125', '150', '175', '200'];
  const safeAccessibility = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  if (textSizes.includes(String(accessibility.textSize))) safeAccessibility.textSize = accessibility.textSize;
  if (accessibility.contrast === 'normal' || accessibility.contrast === 'high') safeAccessibility.contrast = accessibility.contrast;
  if (['auto', 'light', 'dark'].includes(accessibility.colorMode)) safeAccessibility.colorMode = accessibility.colorMode;
  for (const key of ['reducedMotion', 'focusRing', 'largeTargets', 'dyslexicFont'] as const) {
    if (typeof accessibility[key] === 'boolean') safeAccessibility[key] = accessibility[key];
  }
  if (['normal', 'relaxed', 'loose'].includes(accessibility.lineSpacing)) safeAccessibility.lineSpacing = accessibility.lineSpacing;
  if (['normal', 'wide'].includes(accessibility.letterSpacing)) safeAccessibility.letterSpacing = accessibility.letterSpacing;

  return {
    schemaVersion: 1,
    appearance: {
      themeId: validThemeIds.includes(appearance.themeId) ? appearance.themeId : DEFAULT_PERSONAL_SETTINGS.appearance.themeId,
      interfaceDensity: appearance.interfaceDensity === 'compact' ? 'compact' : 'comfortable',
      textSize: textSizes.includes(String(appearance.textSize)) ? appearance.textSize : '100',
    },
    accessibility: safeAccessibility,
    notifications: {
      incidentAssignments: typeof notifications.incidentAssignments === 'boolean' ? notifications.incidentAssignments : true,
      taskUpdates: typeof notifications.taskUpdates === 'boolean' ? notifications.taskUpdates : true,
      qualificationReminders: typeof notifications.qualificationReminders === 'boolean' ? notifications.qualificationReminders : true,
      accountSecurity: typeof notifications.accountSecurity === 'boolean' ? notifications.accountSecurity : true,
    },
    languageRegion: {
      language: 'en',
      dateFormat: languageRegion.dateFormat === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD-MM-YYYY',
      timeFormat: languageRegion.timeFormat === '12h' ? '12h' : '24h',
      timeZone: typeof languageRegion.timeZone === 'string' && languageRegion.timeZone.length <= 64
        ? languageRegion.timeZone
        : 'Asia/Kolkata',
    },
  };
}

export const SaferAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<SaferProfile | null>(null);
  const [settings, setSettings] = useState<PersonalSettings>(DEFAULT_PERSONAL_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const servicesRef = useRef<FirebaseServices | null>(null);

  useEffect(() => {
    let disposed = false;
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;

    if (!isFirebaseConfigured) {
      setLoading(false);
      return () => { disposed = true; };
    }

    const clearDocumentListeners = () => {
      unsubscribeProfile?.();
      unsubscribeSettings?.();
      unsubscribeProfile = null;
      unsubscribeSettings = null;
    };

    getFirebaseServices().then((services) => {
      if (disposed) return;
      servicesRef.current = services;
      unsubscribeAuth = services.authApi.onAuthStateChanged(services.auth, async (firebaseUser: any) => {
        clearDocumentListeners();
        setError(null);
        setUser(firebaseUser);

        if (!firebaseUser) {
          setProfile(null);
          setSettings(DEFAULT_PERSONAL_SETTINGS);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const profileRef = services.firestoreApi.doc(services.db, 'users', firebaseUser.uid);
          let profileSnapshot = await services.firestoreApi.getDoc(profileRef);
          if (!profileSnapshot.exists()) {
            const initialProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              role: 'pending',
              status: 'pending',
              organizationId: null,
              createdAt: services.firestoreApi.serverTimestamp(),
              updatedAt: services.firestoreApi.serverTimestamp(),
            };
            await services.firestoreApi.setDoc(profileRef, initialProfile);
            profileSnapshot = await services.firestoreApi.getDoc(profileRef);
          }
          if (disposed) return;

          if (profileSnapshot.exists()) {
            setProfile(normalizeProfile(profileSnapshot.data(), firebaseUser.uid, firebaseUser.email || ''));
          } else {
            setProfile(null);
          }

          const settingsRef = services.firestoreApi.doc(services.db, 'userSettings', firebaseUser.uid);
          let settingsSnapshot = await services.firestoreApi.getDoc(settingsRef);
          if (!settingsSnapshot.exists()) {
            await services.firestoreApi.setDoc(settingsRef, {
              ...DEFAULT_PERSONAL_SETTINGS,
              updatedAt: services.firestoreApi.serverTimestamp(),
            });
            settingsSnapshot = await services.firestoreApi.getDoc(settingsRef);
          }
          if (disposed) return;
          if (settingsSnapshot.exists()) setSettings(normalizeSettings(settingsSnapshot.data()));
          else setSettings(DEFAULT_PERSONAL_SETTINGS);

          unsubscribeProfile = services.firestoreApi.onSnapshot(profileRef, (snapshot: any) => {
            if (snapshot.exists()) setProfile(normalizeProfile(snapshot.data(), firebaseUser.uid, firebaseUser.email || ''));
          }, (snapshotError: Error) => setError(snapshotError.message));

          unsubscribeSettings = services.firestoreApi.onSnapshot(settingsRef, (snapshot: any) => {
            if (snapshot.exists()) setSettings(normalizeSettings(snapshot.data()));
          }, (snapshotError: Error) => setError(snapshotError.message));
        } catch (loadError) {
          setProfile(null);
          setSettings(DEFAULT_PERSONAL_SETTINGS);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load account data.');
        } finally {
          if (!disposed) setLoading(false);
        }
      });
    }).catch((loadError) => {
      if (!disposed) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to initialize Firebase.');
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      unsubscribeAuth?.();
      clearDocumentListeners();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const services = servicesRef.current;
    if (!services) throw new Error('Firebase is not configured.');
    setError(null);
    await services.authApi.signInWithEmailAndPassword(services.auth, email.trim(), password);
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    const services = servicesRef.current;
    if (!services) throw new Error('Firebase is not configured.');
    setError(null);
    const credential = await services.authApi.createUserWithEmailAndPassword(services.auth, email.trim(), password);
    const cleanName = displayName.trim().slice(0, 100);
    if (cleanName) await services.authApi.updateProfile(credential.user, { displayName: cleanName });
    await services.authApi.sendEmailVerification(credential.user);
  }, []);

  const signOut = useCallback(async () => {
    const services = servicesRef.current;
    if (!services) return;
    await services.authApi.signOut(services.auth);
    setProfile(null);
    setSettings(DEFAULT_PERSONAL_SETTINGS);
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const services = servicesRef.current;
    if (!services) throw new Error('Firebase is not configured.');
    await services.authApi.sendPasswordResetEmail(services.auth, email.trim());
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    const services = servicesRef.current;
    if (!services?.auth.currentUser) return;
    await services.authApi.reload(services.auth.currentUser);
    const refreshedUser = services.auth.currentUser;
    if (refreshedUser) {
      setUser({
        uid: refreshedUser.uid,
        email: refreshedUser.email,
        displayName: refreshedUser.displayName,
        emailVerified: refreshedUser.emailVerified,
      });
    }
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    const services = servicesRef.current;
    const currentUser = services?.auth.currentUser;
    if (!services || !currentUser) throw new Error('Sign in is required.');
    await services.authApi.sendEmailVerification(currentUser);
  }, []);

  const saveProfile = useCallback(async (displayName: string) => {
    const services = servicesRef.current;
    const currentUser = services?.auth.currentUser;
    if (!services || !currentUser) throw new Error('Sign in is required.');
    const cleanName = displayName.trim().slice(0, 100);
    if (!cleanName) throw new Error('Display name cannot be empty.');
    await services.authApi.updateProfile(currentUser, { displayName: cleanName });
    const userRef = services.firestoreApi.doc(services.db, 'users', currentUser.uid);
    await services.firestoreApi.updateDoc(userRef, {
      displayName: cleanName,
      updatedAt: services.firestoreApi.serverTimestamp(),
    });
  }, []);

  const saveSettings = useCallback(async (nextSettings: PersonalSettings) => {
    const services = servicesRef.current;
    const currentUser = services?.auth.currentUser;
    if (!services || !currentUser) throw new Error('Sign in is required.');
    const normalized = normalizeSettings(nextSettings);
    const settingsRef = services.firestoreApi.doc(services.db, 'userSettings', currentUser.uid);
    await services.firestoreApi.setDoc(settingsRef, {
      ...normalized,
      updatedAt: services.firestoreApi.serverTimestamp(),
    });
    setSettings(normalized);
  }, []);

  const submitPrivacyRequest = useCallback(async (
    type: 'access' | 'correction' | 'deletion',
    details: string
  ) => {
    const services = servicesRef.current;
    const currentUser = services?.auth.currentUser;
    if (!services || !currentUser) throw new Error('Sign in is required.');
    const cleanDetails = details.trim().slice(0, 2000);
    const requestsRef = services.firestoreApi.collection(
      services.db, 'privacyRequests', currentUser.uid, 'requests'
    );
    await services.firestoreApi.addDoc(requestsRef, {
      type,
      details: cleanDetails,
      status: 'submitted',
      createdAt: services.firestoreApi.serverTimestamp(),
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<SaferAuthContextValue>(() => ({
    configured: isFirebaseConfigured,
    loading,
    user,
    profile,
    settings,
    error,
    signIn,
    register,
    signOut,
    requestPasswordReset,
    refreshEmailVerification,
    sendVerificationEmail,
    saveProfile,
    saveSettings,
    submitPrivacyRequest,
    clearError,
  }), [
    loading, user, profile, settings, error, signIn, register, signOut,
    requestPasswordReset, refreshEmailVerification, sendVerificationEmail, saveProfile,
    saveSettings, submitPrivacyRequest, clearError,
  ]);

  return <SaferAuthContext.Provider value={value}>{children}</SaferAuthContext.Provider>;
};

export function useSaferAuth(): SaferAuthContextValue {
  const context = useContext(SaferAuthContext);
  if (!context) throw new Error('useSaferAuth must be used inside SaferAuthProvider.');
  return context;
}
