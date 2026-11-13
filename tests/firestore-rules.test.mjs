import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "demo-safer";
const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

async function seedTenant({
  orgId = "org-a",
  uid = "owner-a",
  role = "owner",
  membershipStatus = "active",
  organisationStatus = "active",
} = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "organisations", orgId), {
      orgId,
      displayName: "Synthetic Test Organisation",
      status: organisationStatus,
      schemaVersion: 1,
    });
    await setDoc(doc(db, "organisations", orgId, "members", uid), {
      uid,
      orgId,
      role,
      status: membershipStatus,
    });
  });
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function validPersonnel(uid, orgId = "org-a", recordId = "person-a") {
  return {
    recordId,
    orgId,
    employeeRef: "SYN-001",
    displayLabel: "Synthetic Operator",
    operationalRoles: ["Security Officer"],
    specialisations: ["Physical Security"],
    assignmentSector: "Sector Alpha (Metropolitan)",
    readinessStatus: "REQUIRES_HUMAN_REVIEW",
    requiresHumanReview: true,
    createdAt: serverTimestamp(),
    createdByUid: uid,
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  };
}

function validIncident(uid, orgId = "org-a", incidentId = "incident-a") {
  return {
    incidentId,
    orgId,
    referenceNumber: "SYN-INC-001",
    incidentType: "Access Control Anomaly",
    dateReported: serverTimestamp(),
    title: "Synthetic access anomaly",
    status: "Logged - Pending Officer Review",
    priority: "Moderate",
    summary: "Synthetic test content only.",
    reportedByUid: uid,
    locationLabel: "Synthetic Site A",
    createdAt: serverTimestamp(),
    createdByUid: uid,
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  };
}

test("unauthenticated clients cannot access tenant or profile documents", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "users/user-a")));
  await assertFails(getDoc(doc(db, "organisations/org-a")));
  await assertFails(getDoc(doc(db, "organisations/org-a", "members", "user-a")));
  await assertFails(getDoc(doc(db, "organisations/org-a", "personnel", "person-a")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "incidents", "incident-a"), {}));
});

test("a user can create, read, and update only their allowlisted profile fields", async () => {
  const db = dbFor("user-a");
  const profile = doc(db, "users/user-a");
  await assertSucceeds(setDoc(profile, {
    uid: "user-a",
    displayName: "Synthetic User",
    locale: "en",
    themeId: "obsidian",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(profile));
  await assertSucceeds(updateDoc(profile, {
    displayName: "Updated Synthetic User",
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(db, "users/user-b"), {
    uid: "user-b",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(profile, { role: "platform-admin" }));
  await assertFails(updateDoc(profile, { uid: "user-b", updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(profile));
  await assertFails(getDocs(collection(db, "users")));
});

test("active owner can read organisation metadata and create/update personnel summary", async () => {
  await seedTenant();
  const db = dbFor("owner-a");
  await assertSucceeds(getDoc(doc(db, "organisations/org-a")));
  const person = doc(db, "organisations/org-a/personnel/immutable-person");
  await assertSucceeds(setDoc(person, validPersonnel("owner-a", "org-a", "immutable-person")));
  await assertSucceeds(getDoc(person));
  await assertSucceeds(updateDoc(person, {
    displayLabel: "Reviewed Synthetic Operator",
    updatedAt: serverTimestamp(),
    updatedByUid: "owner-a",
  }));
  await assertFails(deleteDoc(person));
});

test("active admin can create and update an incident without changing reporter provenance", async () => {
  await seedTenant({ uid: "admin-a", role: "admin" });
  const db = dbFor("admin-a");
  const incident = doc(db, "organisations/org-a/incidents/incident-a");
  await assertSucceeds(setDoc(incident, validIncident("admin-a")));
  await assertSucceeds(updateDoc(incident, {
    title: "Reviewed synthetic incident",
    updatedAt: serverTimestamp(),
    updatedByUid: "admin-a",
  }));
  await assertFails(updateDoc(incident, {
    reportedByUid: "attacker",
    updatedAt: serverTimestamp(),
    updatedByUid: "admin-a",
  }));
  await assertFails(deleteDoc(incident));
});

test("manager and viewer cannot read or write tenant operational data", async () => {
  for (const role of ["manager", "viewer"]) {
    const uid = `${role}-a`;
    await seedTenant({ uid, role });
    const db = dbFor(uid);
    await assertFails(getDoc(doc(db, "organisations/org-a")));
    await assertFails(getDoc(doc(db, "organisations/org-a", "personnel", "person-a")));
    await assertFails(setDoc(
      doc(db, "organisations/org-a", "personnel", `${role}-person`),
      validPersonnel(uid, "org-a", `${role}-person`),
    ));
    await assertFails(getDoc(doc(db, "organisations/org-a", "incidents", "incident-a")));
  }
});

test("missing, suspended, and revoked memberships deny tenant access", async () => {
  await seedTenant({ uid: "suspended-a", membershipStatus: "suspended" });
  await seedTenant({ uid: "revoked-a", membershipStatus: "revoked" });
  for (const uid of ["no-membership", "suspended-a", "revoked-a"]) {
    const db = dbFor(uid);
    await assertFails(getDoc(doc(db, "organisations/org-a")));
    await assertFails(getDoc(doc(db, "organisations/org-a", "personnel", "person-a")));
  }
});

test("suspended organisation denies otherwise active owner", async () => {
  await seedTenant({ organisationStatus: "suspended" });
  const db = dbFor("owner-a");
  await assertFails(getDoc(doc(db, "organisations/org-a")));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "personnel", "person-a"),
    validPersonnel("owner-a"),
  ));
});


test("bootstrap trust anchor rejects mismatched UID, tenant, role, and missing organisation", async () => {
  const fixtures = [
    { orgId: "bootstrap-wrong-uid", uid: "wrong-uid-user", member: {
      uid: "different-uid", orgId: "bootstrap-wrong-uid", role: "owner", status: "active",
    } },
    { orgId: "bootstrap-wrong-org", uid: "wrong-org-user", member: {
      uid: "wrong-org-user", orgId: "another-org", role: "owner", status: "active",
    } },
    { orgId: "bootstrap-invalid-role", uid: "invalid-role-user", member: {
      uid: "invalid-role-user", orgId: "bootstrap-invalid-role", role: "platform-admin", status: "active",
    } },
  ];

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const fixture of fixtures) {
      await setDoc(doc(db, "organisations", fixture.orgId), {
        orgId: fixture.orgId,
        displayName: "Synthetic Bootstrap Tenant",
        status: "active",
        schemaVersion: 1,
      });
      await setDoc(
        doc(db, "organisations", fixture.orgId, "members", fixture.uid),
        fixture.member,
      );
    }
    await setDoc(doc(db, "organisations", "bootstrap-missing-org", "members", "orphan-user"), {
      uid: "orphan-user",
      orgId: "bootstrap-missing-org",
      role: "owner",
      status: "active",
    });
  });

  for (const fixture of fixtures) {
    const db = dbFor(fixture.uid);
    await assertFails(getDoc(doc(db, "organisations", fixture.orgId)));
    await assertFails(getDoc(doc(db, "organisations", fixture.orgId, "personnel", "synthetic")));
  }

  const orphanDb = dbFor("orphan-user");
  await assertFails(getDoc(doc(orphanDb, "organisations/bootstrap-missing-org")));
});

test("tenant binding, UID provenance, enums, and strict key allowlists reject spoofed or malformed records", async () => {
  await seedTenant();
  const db = dbFor("owner-a");
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "personnel", "spoofed-org"),
    validPersonnel("owner-a", "org-b", "spoofed-org"),
  ));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "personnel", "spoofed-uid"),
    { ...validPersonnel("attacker", "org-a", "spoofed-uid") },
  ));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "personnel", "bad-sector"),
    { ...validPersonnel("owner-a", "org-a", "bad-sector"), assignmentSector: "Everywhere" },
  ));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "personnel", "extra-field"),
    { ...validPersonnel("owner-a", "org-a", "extra-field"), bloodGroup: "O+" },
  ));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "incidents", "bad-type"),
    { ...validIncident("owner-a", "org-a", "bad-type"), incidentType: "Unlisted Type" },
  ));
  await assertFails(setDoc(
    doc(db, "organisations/org-a", "incidents", "spoofed-org"),
    validIncident("owner-a", "org-b", "spoofed-org"),
  ));
});

test("immutable creator, tenant, and record identifiers cannot be changed", async () => {
  await seedTenant({ orgId: "org-immutable", uid: "owner-immutable" });
  const db = dbFor("owner-immutable");
  const person = doc(db, "organisations/org-immutable/personnel/immutable-person");
  await assertSucceeds(setDoc(person, validPersonnel("owner-immutable", "org-immutable", "immutable-person")));
  await assertFails(updateDoc(person, {
    orgId: "org-b",
    updatedAt: serverTimestamp(),
    updatedByUid: "owner-immutable",
  }));
  await assertFails(updateDoc(person, {
    createdByUid: "other-user",
    updatedAt: serverTimestamp(),
    updatedByUid: "owner-immutable",
  }));
});

test("users can get only their own active, valid membership across supported roles", async () => {
  for (const role of ["owner", "admin", "manager", "viewer"]) {
    const uid = `self-${role}`;
    const orgId = `self-org-${role}`;
    await seedTenant({ orgId, uid, role });
    const db = dbFor(uid);
    await assertSucceeds(getDoc(doc(db, "organisations", orgId, "members", uid)));
    await assertFails(getDoc(doc(db, "organisations", orgId, "members", "someone-else")));
    await assertFails(getDocs(collection(db, `organisations/${orgId}/members`)));
    await assertFails(setDoc(doc(db, "organisations", orgId, "members", uid), {
      uid, orgId, role: "owner", status: "active",
    }));
    await assertFails(updateDoc(doc(db, "organisations", orgId, "members", uid), {
      role: "owner",
    }));
    await assertFails(deleteDoc(doc(db, "organisations", orgId, "members", uid)));
  }
});

test("self-membership get fails closed for invalid membership or organisation trust anchors", async () => {
  const fixtures = [
    { orgId: "self-inactive-member", uid: "inactive-member", role: "owner", membershipStatus: "suspended" },
    { orgId: "self-revoked-member", uid: "revoked-member", role: "owner", membershipStatus: "revoked" },
    { orgId: "self-invalid-role", uid: "invalid-role", role: "platform-admin" },
    { orgId: "self-suspended-org", uid: "suspended-org-member", role: "owner", organisationStatus: "suspended" },
  ];
  for (const fixture of fixtures) {
    await seedTenant(fixture);
    const db = dbFor(fixture.uid);
    await assertFails(getDoc(doc(db, "organisations", fixture.orgId, "members", fixture.uid)));
  }

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "organisations/self-mismatch-uid"), {
      orgId: "self-mismatch-uid", displayName: "Synthetic", status: "active", schemaVersion: 1,
    });
    await setDoc(doc(db, "organisations/self-mismatch-uid/members/mismatch-user"), {
      uid: "different-user", orgId: "self-mismatch-uid", role: "owner", status: "active",
    });
    await setDoc(doc(db, "organisations/self-mismatch-org"), {
      orgId: "another-org", displayName: "Synthetic", status: "active", schemaVersion: 1,
    });
    await setDoc(doc(db, "organisations/self-mismatch-org/members/mismatch-org-user"), {
      uid: "mismatch-org-user", orgId: "another-org", role: "owner", status: "active",
    });
    await setDoc(doc(db, "organisations/self-missing-parent/members/orphan-user"), {
      uid: "orphan-user", orgId: "self-missing-parent", role: "owner", status: "active",
    });
  });

  await assertFails(getDoc(doc(dbFor("mismatch-user"), "organisations/self-mismatch-uid/members/mismatch-user")));
  await assertFails(getDoc(doc(dbFor("mismatch-org-user"), "organisations/self-mismatch-org/members/mismatch-org-user")));
  await assertFails(getDoc(doc(dbFor("orphan-user"), "organisations/self-missing-parent/members/orphan-user")));
});

test("membership, restricted records, audit events, and unapproved organisation writes remain denied", async () => {
  await seedTenant();
  const db = dbFor("owner-a");
  await assertSucceeds(getDoc(doc(db, "organisations/org-a", "members", "owner-a")));
  await assertFails(getDoc(doc(db, "organisations/org-a", "members", "attacker")));
  await assertFails(getDocs(collection(db, "organisations/org-a/members")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "members", "attacker"), {
    uid: "attacker", orgId: "org-a", role: "owner", status: "active",
  }));
  await assertFails(getDoc(doc(db, "organisations/org-a", "auditEvents", "event-a")));
  await assertFails(getDoc(doc(db, "organisations/org-a", "personnelPrivate", "person-a")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "incidentRestricted", "incident-a"), {}));
  await assertFails(setDoc(doc(db, "organisations/org-a", "auditEvents", "event-a"), {}));
  await assertFails(setDoc(doc(db, "organisations/org-a"), {
    orgId: "org-a", displayName: "Attacker Org", status: "active",
  }));
});

test("cross-tenant membership, organisation, operational, and audit access are denied", async () => {
  await seedTenant({ orgId: "tenant-isolation-a", uid: "tenant-owner-a" });
  await seedTenant({ orgId: "tenant-isolation-b", uid: "tenant-owner-b" });

  const attacker = dbFor("tenant-owner-a");
  await assertFails(getDoc(doc(attacker, "organisations/tenant-isolation-b")));
  await assertFails(getDoc(doc(attacker, "organisations/tenant-isolation-b/members/tenant-owner-b")));
  await assertFails(getDoc(doc(attacker, "organisations/tenant-isolation-b/personnel/person-b")));
  await assertFails(getDoc(doc(attacker, "organisations/tenant-isolation-b/incidents/incident-b")));
  await assertFails(setDoc(doc(attacker, "organisations/tenant-isolation-b/personnel/cross-tenant-write"),
    validPersonnel("tenant-owner-a", "tenant-isolation-b", "cross-tenant-write")));
  await assertFails(setDoc(doc(attacker, "organisations/tenant-isolation-b/incidents/cross-tenant-incident"),
    validIncident("tenant-owner-a", "tenant-isolation-b", "cross-tenant-incident")));
  await assertFails(getDoc(doc(attacker, "organisations/tenant-isolation-b/auditEvents/event-b")));
  await assertFails(setDoc(doc(attacker, "organisations/tenant-isolation-b/auditEvents/event-b"), {
    eventId: "event-b", orgId: "tenant-isolation-b", actorUid: "tenant-owner-a",
    eventType: "membership.role_changed",
  }));
});

test("membership mutation attempts fail for every role, including cross-user and cross-tenant targets", async () => {
  for (const role of ["owner", "admin", "manager", "viewer"]) {
    const uid = "mutation-" + role;
    const orgId = "mutation-org-" + role;
    await seedTenant({ orgId, uid, role });
    await seedTenant({ orgId: orgId + "-other", uid: "other-member" });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organisations/" + orgId + "/members/other-member"), {
        uid: "other-member", orgId, role: "viewer", status: "active",
      });
    });
    const db = dbFor(uid);

    await assertFails(setDoc(doc(db, "organisations/" + orgId + "/members/new-member"), {
      uid: "new-member", orgId, role: "viewer", status: "active",
    }));
    await assertFails(updateDoc(doc(db, "organisations/" + orgId + "/members/" + uid), { role: "owner" }));
    await assertFails(updateDoc(doc(db, "organisations/" + orgId + "/members/other-member"), { role: "admin" }));
    await assertFails(deleteDoc(doc(db, "organisations/" + orgId + "/members/" + uid)));
    await assertFails(setDoc(doc(db, "organisations/" + orgId + "-other/members/attacker"), {
      uid: "attacker", orgId: orgId + "-other", role: "owner", status: "active",
    }));
  }
});
test("tenant list queries must constrain the organisation field", async () => {
  await seedTenant();
  const db = dbFor("owner-a");
  await assertSucceeds(getDocs(query(
    collection(db, "organisations/org-a/personnel"),
    where("orgId", "==", "org-a"),
  )));
  await assertFails(getDocs(collection(db, "organisations/org-a/personnel")));
});

test("evidence metadata is read-only and deletes remain disabled", async () => {
  await seedTenant();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "organisations/org-a", "evidence", "evidence-a"), {
      evidenceId: "evidence-a", orgId: "org-a",
    });
  });
  const db = dbFor("owner-a");
  await assertSucceeds(getDoc(doc(db, "organisations/org-a", "evidence", "evidence-a")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "evidence", "evidence-b"), {
    evidenceId: "evidence-b", orgId: "org-a",
  }));
});


test("personnel updates reject extra keys, immutable identity/provenance changes, invalid values, and spoofed timestamps", async () => {
  await seedTenant({ orgId: "org-personnel-update", uid: "owner-personnel-update" });
  const db = dbFor("owner-personnel-update");
  const person = doc(db, "organisations/org-personnel-update/personnel/personnel-update-a");
  await assertSucceeds(setDoc(person, validPersonnel(
    "owner-personnel-update", "org-personnel-update", "personnel-update-a",
  )));

  const rejectedUpdates = [
    { bloodGroup: "O+", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { recordId: "personnel-update-b", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { orgId: "org-other", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { createdByUid: "attacker", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { createdAt: new Date("2020-01-01T00:00:00.000Z"), updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { updatedByUid: "attacker", updatedAt: serverTimestamp() },
    { assignmentSector: "Unlisted Sector", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { readinessStatus: "UNAPPROVED_STATUS", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { operationalRoles: "Security Officer", updatedAt: serverTimestamp(), updatedByUid: "owner-personnel-update" },
    { updatedAt: new Date("2020-01-01T00:00:00.000Z"), updatedByUid: "owner-personnel-update" },
  ];

  for (const changes of rejectedUpdates) {
    await assertFails(updateDoc(person, changes));
  }
});

test("incident updates reject extra keys, immutable identity/reporter provenance changes, invalid values, and spoofed timestamps", async () => {
  await seedTenant({ orgId: "org-incident-update", uid: "owner-incident-update" });
  const db = dbFor("owner-incident-update");
  const incident = doc(db, "organisations/org-incident-update/incidents/incident-update-a");
  await assertSucceeds(setDoc(incident, validIncident(
    "owner-incident-update", "org-incident-update", "incident-update-a",
  )));

  const rejectedUpdates = [
    { internalClassification: "restricted", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { incidentId: "incident-update-b", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { orgId: "org-other", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { createdByUid: "attacker", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { reportedByUid: "attacker", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { createdAt: new Date("2020-01-01T00:00:00.000Z"), updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { updatedByUid: "attacker", updatedAt: serverTimestamp() },
    { incidentType: "Unlisted Type", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { status: "Unapproved Status", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { priority: "Critical", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { dateReported: "not-a-timestamp", updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { summary: 42, updatedAt: serverTimestamp(), updatedByUid: "owner-incident-update" },
    { updatedAt: new Date("2020-01-01T00:00:00.000Z"), updatedByUid: "owner-incident-update" },
  ];

  for (const changes of rejectedUpdates) {
    await assertFails(updateDoc(incident, changes));
  }
});
