export const SAFER_FIREBASE_PROJECT_ID = 'safer-2026';

export interface FirebaseWebConfig {
  apiKey?: unknown;
  authDomain?: unknown;
  projectId?: unknown;
  appId?: unknown;
}

export type FirebaseConfigStatus =
  | { configured: true; reason: 'ready' }
  | { configured: false; reason: 'missing_values' | 'unexpected_project' };

export function validateFirebaseWebConfig(config: FirebaseWebConfig): FirebaseConfigStatus {
  if (config.projectId !== SAFER_FIREBASE_PROJECT_ID) {
    return { configured: false, reason: 'unexpected_project' };
  }
  const required = [config.apiKey, config.authDomain, config.projectId, config.appId];
  if (!required.every((value) => typeof value === 'string' && value.trim().length > 0)) {
    return { configured: false, reason: 'missing_values' };
  }
  return { configured: true, reason: 'ready' };
}
