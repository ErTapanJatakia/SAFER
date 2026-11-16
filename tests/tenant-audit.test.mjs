import test from 'node:test';
import assert from 'node:assert/strict';
import { listTenantAuditEvents } from '../src/server/tenant-audit.mjs';

const orgId = `org_${'a'.repeat(32)}`;
const stamp = (value) => ({toDate:()=>new Date(value)});
function db(rows) {
  const find = (id) => rows.find(([rowId]) => rowId === id);
  return {
    doc(path) {
      const id = path.split('/').at(-1);
      return {async get() {
        const row = find(id);
        return {exists:Boolean(row),id,data:()=>row?.[1]};
      }};
    },
    collection() {
      const query = {
        filters:[], cursorId:null, cap:0,
        where(field,operator,value) { this.filters.push({field,operator,value}); return this; },
        orderBy() { return this; },
        startAfter(snapshot) { this.cursorId=snapshot.id; return this; },
        limit(value) { this.cap=value; return this; },
        async get() {
          let selected = rows.filter(([,value]) => this.filters.every(filter => {
            const time = value.occurredAt?.toDate?.()?.getTime?.();
            const bound = filter.value.getTime();
            return filter.operator === '>=' ? time >= bound : time < bound;
          }));
          selected.sort((a,b)=>b[1].occurredAt.toDate()-a[1].occurredAt.toDate());
          if(this.cursorId){const index=selected.findIndex(([id])=>id===this.cursorId);selected=index<0?[]:selected.slice(index+1);}
          return {docs:selected.slice(0,this.cap).map(([id,data])=>({id,data:()=>data}))};
        },
      };
      return query;
    },
  };
}
const row = (id, date, extra={}) => [id,{
  orgId,action:'tenant.incident.created',actorUid:'u1',targetResourceId:'inc_1',
  details:{email:'private@example.test',invitationId:'secret'},occurredAt:stamp(date),...extra,
}];

test('audit reader returns only minimized events belonging to the requested tenant', async()=>{
  const rows=[
    row('a'.repeat(32),'2026-01-03T00:00:00Z'),
    ['b'.repeat(32),{orgId:'org_'+'b'.repeat(32),action:'tenant.member.invitation_created',actorUid:'u2',details:{email:'other@example.test'}}],
  ];
  const result=await listTenantAuditEvents({orgId,database:db(rows)});
  assert.equal(result.events.length,1);
  assert.equal(result.events[0].eventId,'a'.repeat(32));
  assert.equal('details' in result.events[0],false);
  assert.equal('targetResourceId' in result.events[0],true);
});

test('audit reader applies inclusive date filters and returns a stable next cursor',async()=>{
  const rows=[
    row('1'.repeat(32),'2026-01-03T12:00:00Z'),
    row('2'.repeat(32),'2026-01-02T12:00:00Z'),
    row('3'.repeat(32),'2026-01-01T12:00:00Z'),
  ];
  const first=await listTenantAuditEvents({orgId,database:db(rows),limit:2,startDate:'2026-01-01',endDate:'2026-01-03'});
  assert.deepEqual(first.events.map(event=>event.eventId),['1'.repeat(32),'2'.repeat(32)]);
  assert.equal(first.hasMore,true);
  assert.equal(first.nextCursor,'2'.repeat(32));
  const second=await listTenantAuditEvents({orgId,database:db(rows),limit:2,startDate:'2026-01-01',endDate:'2026-01-03',cursor:first.nextCursor});
  assert.deepEqual(second.events.map(event=>event.eventId),['3'.repeat(32)]);
  assert.equal(second.hasMore,false);
});

test('audit pagination returns subsequent rows when no date filter excludes them',async()=>{
  const rows=[
    row('1'.repeat(32),'2026-01-03T12:00:00Z'),
    row('2'.repeat(32),'2026-01-02T12:00:00Z'),
    row('3'.repeat(32),'2026-01-01T12:00:00Z'),
  ];
  const first=await listTenantAuditEvents({orgId,database:db(rows),limit:2});
  const second=await listTenantAuditEvents({orgId,database:db(rows),limit:2,cursor:first.nextCursor});
  assert.deepEqual(second.events.map(event=>event.eventId),['3'.repeat(32)]);
  assert.equal(second.hasMore,false);
  assert.equal(second.nextCursor,null);
});

test('invalid tenant locator, date range, and cursor are rejected',async()=>{
  await assert.rejects(()=>listTenantAuditEvents({orgId:'../../other',database:db([])}),/invalid_request/);
  await assert.rejects(()=>listTenantAuditEvents({orgId,database:db([]),startDate:'2026-02-30'}),/invalid_request/);
  await assert.rejects(()=>listTenantAuditEvents({orgId,database:db([]),startDate:'2026-02-02',endDate:'2026-02-01'}),/invalid_request/);
  await assert.rejects(()=>listTenantAuditEvents({orgId,database:db([]),cursor:'../../other'}),/invalid_request/);
});
