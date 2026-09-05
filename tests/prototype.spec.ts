import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('desktop document, navigation and accessible content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('LOCK CITY');
  await expect(page.locator('.hero-media img')).toHaveJSProperty('complete', true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Explore latest drop', exact: true }).click();
  await expect(page).toHaveURL(/#latest-drop$/);
  await expect(page.locator('#latest-drop')).toBeInViewport();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('mobile stays static and menu supports keyboard and anchor focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.experience')).toHaveAttribute('data-mode', 'STATIC');
  await expect(page.locator('canvas')).toHaveCount(0);
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('navigation', { name: 'Mobile', exact: true }).getByRole('link', { name: 'Latest drop' }).click();
  await expect(page.locator('#latest-drop')).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('reduced motion prevents canvas and removes smooth scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.experience')).toHaveAttribute('data-mode', 'STATIC');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.getByRole('link', { name: 'Explore latest drop', exact: true }).click();
  await expect(page.locator('#latest-drop')).toBeInViewport();
});

test('no WebGL keeps HTML and navigation intact', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.experience')).toHaveAttribute('data-mode', 'STATIC');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore latest drop', exact: true }).click();
  await expect(page.locator('#latest-drop')).toBeInViewport();
});

test('canvas mounts once, pauses offscreen, survives repeated disposal, and falls back on loss', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1);
  for (let iteration = 0; iteration < 3; iteration++) {
    await page.getByRole('button', { name: 'Pause motion' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: 'Enable motion' }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.experience')).toHaveAttribute('data-active', 'false');
  await page.getByRole('link', { name: 'Back to the city' }).click();
  await expect(page.locator('.experience')).toHaveAttribute('data-active', 'true');
  await page.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.experience')).toHaveAttribute('data-mode', 'STATIC');
  await expect(page.getByRole('link', { name: 'Explore latest drop', exact: true })).toBeVisible();
});

test('HTML remains usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5190');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('LOCK CITY');
  await page.getByRole('link', { name: 'Explore latest drop', exact: true }).click();
  await expect(page).toHaveURL(/#latest-drop$/);
  await context.close();
});
