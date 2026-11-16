import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ownerUi = readFileSync(new URL('../src/components/OwnerControlCentre.tsx', import.meta.url), 'utf8');

test('Owner UI retains the issued initial invitation identifier for revocation', () => {
  assert.match(ownerUi, /result\.superAdminInvitation\?\.invitationId/);
  assert.match(ownerUi, /setCreatedInvitation\(/);
  assert.match(ownerUi, /\/api\/owner\/organisations\/invitations\/revoke/);
  assert.match(ownerUi, /reason: invitationRevokeReason/);
});

test('Owner UI does not expose invitation revocation as a tenant operation', () => {
  assert.doesNotMatch(ownerUi, /\/api\/tenant\/invitations\/revoke/);
  assert.match(ownerUi, /replacement invitation issuance is not available yet/);
});
