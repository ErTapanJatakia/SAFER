import { test, expect } from '@playwright/test';

test('two same-origin tabs serialize real repository writes and reject the stale tab', async ({ browser }) => {
  const context = await browser.newContext();
  const firstTab = await context.newPage();
  const secondTab = await context.newPage();

  try {
    await firstTab.goto('/tests/browser/fixtures/demo-cross-tab.html?reset=1');
    await expect(firstTab.locator('#status')).toHaveText('Browser repository ready');
    await secondTab.goto('/tests/browser/fixtures/demo-cross-tab.html');
    await expect(secondTab.locator('#status')).toHaveText('Browser repository ready');

    expect(await firstTab.evaluate(() => Boolean(navigator.locks))).toBe(true);
    expect(await secondTab.evaluate(() => Boolean(navigator.locks))).toBe(true);

    const outcomes = await Promise.all([
      firstTab.evaluate(async () => {
        try { await window.saferBrowserHarness.savePersonnel('browser-tab-a', 'Browser Tab A'); return { status: 'fulfilled' }; }
        catch (error) { return { status: 'rejected', message: String(error) }; }
      }),
      secondTab.evaluate(async () => {
        try { await window.saferBrowserHarness.savePersonnel('browser-tab-b', 'Browser Tab B'); return { status: 'fulfilled' }; }
        catch (error) { return { status: 'rejected', message: String(error) }; }
      }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const rejectedIndex = outcomes.findIndex((outcome) => outcome.status === 'rejected');
    const rejected = outcomes[rejectedIndex];
    expect(rejected.message).toMatch(/Cross-tab conflict/);
    const losingTab = rejectedIndex === 0 ? firstTab : secondTab;
    await expect.poll(() => losingTab.evaluate(() => window.saferBrowserHarness.externalChange)).not.toBeNull();

    const persisted = await firstTab.evaluate(() => {
      const raw = window.localStorage.getItem('prot_ops_personnel_v2');
      return raw ? JSON.parse(raw) : [];
    });
    const acceptedIds = ['browser-tab-a', 'browser-tab-b'].filter((id) => persisted.some((record) => record.id === id));
    expect(acceptedIds).toHaveLength(1);
  } finally {
    await context.close();
  }
});
