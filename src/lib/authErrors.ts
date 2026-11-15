const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'account-exists-with-different-credential': 'An account already exists with a different sign-in method. Sign in using that method first.',
  'cancelled-popup-request': 'A Google sign-in request is already in progress. Finish or close it, then retry.',
  'network-request-failed': 'Network connection failed. Check your connection and retry.',
  'operation-not-allowed': 'Google sign-in is disabled for this Firebase project. Enable Google in Firebase Authentication sign-in providers.',
  'popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and retry.',
  'popup-closed-by-user': 'Google sign-in was closed before completion.',
  'unauthorized-domain': 'This website is not authorised for Firebase sign-in. Add its exact hostname under Firebase Authentication authorised domains.',
  'web-storage-unsupported': 'Browser storage is unavailable. Enable site storage/cookies for this website and retry.',
  'invalid-api-key': 'Firebase configuration is invalid for this deployment. The site administrator must verify its public Firebase web configuration.',
  'invalid-credential': 'Unable to sign in with those details. Check your email and password.',
  'wrong-password': 'Unable to sign in with those details. Check your email and password.',
  'user-not-found': 'Unable to sign in with those details. Check your email and password.',
  'too-many-requests': 'Too many attempts. Please wait before trying again.',
  'email-already-in-use': 'This account could not be created. Try signing in or use password reset.',
};

function getFirebaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  const raw = (error as { code?: unknown }).code;
  if (typeof raw !== 'string') return '';
  const normalized = raw.trim().toLowerCase();
  return normalized.startsWith('auth/') ? normalized.slice(5) : normalized;
}

/** Safe, user-facing Firebase error mapping. Never returns raw SDK messages or credentials. */
export function getAuthErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);
  const known = AUTH_ERROR_MESSAGES[code];
  if (known) return known;
  return code
    ? `The account request could not be completed. Retry, then share this diagnostic code with support: auth/${code}.`
    : 'The account request could not be completed. Check your connection and retry.';
}
