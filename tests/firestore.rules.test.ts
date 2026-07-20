import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

const PROJECT_ID = 'velocity-logger-rules-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

async function seedSetup(id: string, userId: string, visibility: 'private' | 'shared') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'setups', id), {
      userId,
      visibility,
      circuit: '筑波2000',
      carModel: '86',
    });
  });
}

async function seedEntitlement(userId: string, setupId: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sharingEntitlements', userId), {
      setupId,
      updatedAt: new Date(),
    });
  });
}

describe('Give-to-Get security rules', () => {
  it('共有していないユーザーは他人のsharedセットアップを読めない', async () => {
    await seedSetup('owner-shared', 'owner', 'shared');
    const reader = testEnv.authenticatedContext('reader').firestore();
    await assertFails(getDoc(doc(reader, 'setups', 'owner-shared')));
  });

  it('privateセットアップを参照する偽entitlementは作れない', async () => {
    await seedSetup('reader-private', 'reader', 'private');
    const reader = testEnv.authenticatedContext('reader').firestore();
    await assertFails(setDoc(doc(reader, 'sharingEntitlements', 'reader'), {
      setupId: 'reader-private',
      updatedAt: serverTimestamp(),
    }));
  });

  it('他人のsharedセットアップを参照する偽entitlementは作れない', async () => {
    await seedSetup('owner-shared', 'owner', 'shared');
    const reader = testEnv.authenticatedContext('reader').firestore();
    await assertFails(setDoc(doc(reader, 'sharingEntitlements', 'reader'), {
      setupId: 'owner-shared',
      updatedAt: serverTimestamp(),
    }));
  });

  it('本人のsharedセットアップを証明すると他人のsharedデータを読める', async () => {
    await seedSetup('reader-shared', 'reader', 'shared');
    await seedSetup('owner-shared', 'owner', 'shared');
    const reader = testEnv.authenticatedContext('reader').firestore();
    await assertSucceeds(setDoc(doc(reader, 'sharingEntitlements', 'reader'), {
      setupId: 'reader-shared',
      updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(reader, 'setups', 'owner-shared')));
  });

  it('証明元をprivateへ戻すと既存entitlementがあっても閲覧できない', async () => {
    await seedSetup('reader-shared', 'reader', 'shared');
    await seedSetup('owner-shared', 'owner', 'shared');
    await seedEntitlement('reader', 'reader-shared');
    const reader = testEnv.authenticatedContext('reader').firestore();
    await assertSucceeds(updateDoc(doc(reader, 'setups', 'reader-shared'), { visibility: 'private' }));
    await assertFails(getDoc(doc(reader, 'setups', 'owner-shared')));
  });

  it('本人だけがentitlementを削除できる', async () => {
    await seedSetup('reader-shared', 'reader', 'shared');
    await seedEntitlement('reader', 'reader-shared');
    const reader = testEnv.authenticatedContext('reader').firestore();
    const other = testEnv.authenticatedContext('other').firestore();
    await assertFails(deleteDoc(doc(other, 'sharingEntitlements', 'reader')));
    await assertSucceeds(deleteDoc(doc(reader, 'sharingEntitlements', 'reader')));
  });
});
