import { test, expect } from '@playwright/test';

test('real SAFER UI exposes conflict recovery, downloads last-confirmed snapshot, and clears warning after reload', async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: true });
  const workspaceTab = await context.newPage();
  const competingTab = await context.newPage();

  try {
    await workspaceTab.goto('/tests/browser/fixtures/demo-conflict-app.html');
    await expect(workspaceTab.getByText('SAFER', { exact: false }).first()).toBeVisible();

    await competingTab.goto('/tests/browser/fixtures/demo-conflict-app.html');
    await expect(competingTab.getByText('SAFER', { exact: false }).first()).toBeVisible();

    // Simulate a different same-origin tab committing a valid, empty personnel collection.
    await competingTab.evaluate(() => {
      window.localStorage.setItem('prot_ops_personnel_v2', '[]');
    });

    const warning = workspaceTab.getByRole('alert').filter({ hasText: 'Another SAFER tab changed operational records' });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('unsubmitted form fields are not included');
    await expect(warning).toContainText('JSON is unencrypted');

    const downloadPromise = workspaceTab.waitForEvent('download');
    await warning.getByRole('button', { name: 'Download this tab’s records' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^safer-demo-conflict-snapshot-.*\.json$/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const fs = await import('node:fs/promises');
    const snapshot = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    expect(snapshot.format).toBe('SAFER Demo Guest conflict snapshot');
    expect(snapshot.version).toBe(1);
    expect(snapshot.records.personnel.length).toBeGreaterThan(0);
    expect(snapshot.records).toHaveProperty('incidents');
    expect(snapshot.records).toHaveProperty('cyberHygiene');
    expect(snapshot.records).toHaveProperty('checklist');

    await warning.getByRole('button', { name: 'Reload workspace' }).click();
    await expect(workspaceTab.getByRole('alert').filter({ hasText: 'Another SAFER tab changed operational records' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
