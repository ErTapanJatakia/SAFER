import test from 'node:test';
import assert from 'node:assert/strict';
import { listTenantAuditEvents } from '../src/server/tenant-audit.mjs';

const orgId = `org_${'a'.repeat(32)}`;
function db(rows) {
  return { collection() { return { orderBy() { return this; }, limit(n) { this.n=n; return this; },
    async get() { return { docs: rows.slice(0,this.n).map(([id,data])=>({id,data:()=>data})) }; } }; } };
}
const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };

test('audit reader receives only minimized events belonging to the requested tenant', async()=>{
  const rows=[
    ['good',{orgId,action:'tenant.incident.created',actorUid:'u1',targetResourceId:'inc_1',details:{email:'private@example.test',invitationId:'secret'},occurredAt:timestamp}],
    ['other',{orgId:'org_'+'b'.repeat(32),action:'tenant.member.invitation_created',actorUid:'u2',details:{email:'other@example.test'},occurredAt:timestamp}],
  ];
  const result=await listTenantAuditEvents({orgId,database:db(rows)});
  assert.equal(result.events.length,1);
  assert.equal(result.events[0].eventId,'good');
  assert.equal('details' in result.events[0],false);
  assert.equal(result.events[0].targetResourceId,'inc_1');
});

test('malformed or oversized stored audit fields are rejected or omitted', async()=>{
  const rows=[
    ['bad-actor',{orgId,action:'tenant.incident.created',actorUid:'x'.repeat(129),occurredAt:timestamp}],
    ['bad-time',{orgId,action:'tenant.incident.created',actorUid:'u1',occurredAt:{toDate:()=>new Date(Number.NaN)}}],
    ['bad-id',{orgId,action:'tenant.incident.created',actorUid:'u1',targetResourceId:'x'.repeat(257),occurredAt:timestamp}],
    ['good',{orgId,action:'tenant.incident.created',actorUid:'u1',targetUid:'x'.repeat(129),occurredAt:timestamp}],
  ];
  const result=await listTenantAuditEvents({orgId,database:db(rows)});
  assert.deepEqual(result.events.map(event=>event.eventId),['good']);
  assert.equal(result.events[0].targetUid,null);
});

test('invalid tenant locator is rejected',async()=>{
  await assert.rejects(()=>listTenantAuditEvents({orgId:'../../other',database:db([])}),/invalid_request/);
});
