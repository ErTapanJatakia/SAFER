import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

test("unauthenticated clients cannot read or write any document", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  const target = doc(db, "organisations/org-a/personnel/person-a");

  await assertFails(getDoc(target));
  await assertFails(setDoc(target, { displayName: "Synthetic Person" }));
});

test("authenticated users cannot read or write user profiles", async () => {
  const db = testEnv.authenticatedContext("user-a").firestore();
  const target = doc(db, "users/user-a");

  await assertFails(getDoc(target));
  await assertFails(setDoc(target, { displayName: "Synthetic User" }));
});

test("authenticated users cannot access organisation membership or records", async () => {
  const db = testEnv.authenticatedContext("user-a").firestore();
  const membership = doc(db, "organisations/org-a/members/user-a");
  const incident = doc(db, "organisations/org-a/incidents/incident-a");

  await assertFails(getDoc(membership));
  await assertFails(setDoc(membership, { role: "owner" }));
  await assertFails(getDoc(incident));
  await assertFails(setDoc(incident, { summary: "Synthetic incident" }));
});

test("a different authenticated user cannot access another user's namespace", async () => {
  const db = testEnv.authenticatedContext("user-b").firestore();
  const target = doc(db, "users/user-a");

  await assertFails(getDoc(target));
  await assertFails(setDoc(target, { role: "platform-admin" }));
});