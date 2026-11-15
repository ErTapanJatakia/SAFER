import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  provisionFirstPlatformOwner,
  revokePlatformOwner,
} from '../src/server/platform-owner-bootstrap.mjs';

const PROJECT_ID = 'safer-2026';

function parseArguments(argv) {
  const [command, ...items] = argv;
  const values = Object.fromEntries(items.map((item) => {
    const match = /^--([a-z-]+)=(.*)$/.exec(item);
    if (!match) throw new Error(`Invalid argument: ${item}`);
    return [match[1], match[2]];
  }));
  return { command, values };
}

async function main() {
  const { command, values } = parseArguments(process.argv.slice(2));
  if (!['provision', 'revoke'].includes(command)) {
    throw new Error('Usage: node scripts/platform-owner.mjs <provision|revoke> --uid=UID --change-ref=REF --operator-ref=REF --reason="..."');
  }

  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Set FIREBASE_PROJECT_ID=${PROJECT_ID} explicitly before running this operator tool.`);
  }
  if (!process.env.SAFER_OPERATOR_APPROVED || process.env.SAFER_OPERATOR_APPROVED !== 'YES') {
    throw new Error('Set SAFER_OPERATOR_APPROVED=YES only after completing the out-of-band approval and change record.');
  }

  const app = getApps().find((candidate) => candidate.name === 'safer-owner-operator')
    ?? initializeApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
    }, 'safer-owner-operator');
  const authAdmin = getAuth(app);
  const database = getFirestore(app);
  const common = {
    uid: values.uid,
    changeReference: values['change-ref'],
    operatorReference: values['operator-ref'],
    reason: values.reason,
    database,
    serverTimestamp: () => FieldValue.serverTimestamp(),
  };

  const result = command === 'provision'
    ? await provisionFirstPlatformOwner({ ...common, authAdmin })
    : await revokePlatformOwner(common);

  process.stdout.write(`Platform Owner ${result.status}: ${result.uid}\n`);
}

main().catch((error) => {
  process.stderr.write(`Platform Owner operation failed: ${error.message}\n`);
  process.exitCode = 1;
});
