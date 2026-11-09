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
  await seedTenant();
  const db = dbFor("owner-a");
  const person = doc(db, "organisations/org-a/personnel/person-a");
  await assertSucceeds(setDoc(person, validPersonnel("owner-a")));
  await assertFails(updateDoc(person, {
    orgId: "org-b",
    updatedAt: serverTimestamp(),
    updatedByUid: "owner-a",
  }));
  await assertFails(updateDoc(person, {
    createdByUid: "other-user",
    updatedAt: serverTimestamp(),
    updatedByUid: "owner-a",
  }));
});

test("membership, restricted records, audit events, and unapproved organisation writes remain denied", async () => {
  await seedTenant();
  const db = dbFor("owner-a");
  await assertFails(getDoc(doc(db, "organisations/org-a", "members", "owner-a")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "members", "attacker"), {
    uid: "attacker", orgId: "org-a", role: "owner", status: "active",
  }));
  await assertFails(getDoc(doc(db, "organisations/org-a", "personnelPrivate", "person-a")));
  await assertFails(setDoc(doc(db, "organisations/org-a", "incidentRestricted", "incident-a"), {}));
  await assertFails(setDoc(doc(db, "organisations/org-a", "auditEvents", "event-a"), {}));
  await assertFails(setDoc(doc(db, "organisations/org-a"), {
    orgId: "org-a", displayName: "Attacker Org", status: "active",
  }));
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
