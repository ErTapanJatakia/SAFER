import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const EXPECTED_PROJECT_ID = 'safer-2026';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!raw || !projectId) throw new Error('Platform identity service is not configured.');
  if (projectId !== EXPECTED_PROJECT_ID) throw new Error('Platform identity project configuration is invalid.');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('Platform identity service is not configured.');
  }

  const privateKey = typeof serviceAccount.private_key === 'string'
    ? serviceAccount.private_key.replace(/\\n/g, '\n')
    : '';

  if (
    serviceAccount.type !== 'service_account'
    || serviceAccount.project_id !== projectId
    || typeof serviceAccount.client_email !== 'string'
    || !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(serviceAccount.client_email)
    || !/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----\s*$/.test(privateKey)
  ) {
    throw new Error('Platform identity service credentials are invalid.');
  }

  return {
    projectId,
    serviceAccount: {
      ...serviceAccount,
      private_key: privateKey,
    },
  };
}

const { projectId, serviceAccount } = loadServiceAccount();
const app = getApps().find((candidate) => candidate.name === 'safer-platform-owner')
  ?? initializeApp({ credential: cert(serviceAccount), projectId }, 'safer-platform-owner');

export const platformAuth = getAuth(app);
export const platformDb = getFirestore(app);
