import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function expectNoAxeViolations(page, surface) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = await Promise.all(results.violations.map(async (violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: await Promise.all(violation.nodes.map(async (node) => {
      const target = node.target?.[0];
      let landmarkAncestry = [];
      if (target) {
        const locator = page.locator(target).first();
        if (await locator.count()) {
          landmarkAncestry = await locator.evaluate((element) => {
            const ancestry = [];
            let current = element;
            while (current && ancestry.length < 8) {
              ancestry.push({
                tag: current.tagName.toLowerCase(),
                id: current.id || undefined,
                className: typeof current.className === 'string' ? current.className : undefined,
                role: current.getAttribute('role') || undefined,
                ariaLabel: current.getAttribute('aria-label') || undefined,
              });
              current = current.parentElement;
            }
            return ancestry;
          });
        }
      }
      return {
        target: node.target,
        summary: node.failureSummary,
        landmarkAncestry,
      };
    })),
  })));
  expect(summary, `axe-core accessibility violations on ${surface}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

test('login screen has no detected WCAG A/AA or axe best-practice violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue as Demo Guest' })).toBeVisible();
  await expectNoAxeViolations(page, 'signed-out login');
});

test('synthetic Demo Guest workspace navigation surfaces pass axe-core scans', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as Demo Guest' }).click();
  await expect(page.getByText('Demo workspace:', { exact: false })).toBeVisible();

  await expectNoAxeViolations(page, 'Demo Guest dashboard');

  const sections = [
    { name: /2\. Personnel Readiness/, surface: 'personnel readiness' },
    { name: /3\. Incident Reports/, surface: 'incident reports' },
    { name: /4\. Cybersecurity Hygiene/, surface: 'cybersecurity hygiene' },
    { name: /5\. Pre-Deployment Checklist/, surface: 'pre-deployment checklist' },
  ];

  for (const section of sections) {
    await page.getByRole('button', { name: section.name }).first().click();
    await expectNoAxeViolations(page, section.surface);
  }
});

test('mobile navigation drawer has no detected WCAG A/AA or axe best-practice violations', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue as Demo Guest' }).click();
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expectNoAxeViolations(page, 'mobile navigation drawer');
  } finally {
    await context.close();
  }
});
