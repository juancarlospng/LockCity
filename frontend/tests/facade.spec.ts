import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const routes = [
  "/",
  "/shop",
  "/drops",
  "/city",
  "/people",
  "/archive",
  "/transmissions",
  "/journal",
  "/cart",
  "/collections/core",
  "/collections/drop",
  "/collections/collab",
  "/collections/archive",
];
const missing = [
  "/product/unavailable-item",
  "/shop/unavailable-item",
  "/drops/unavailable-drop",
  "/people/unavailable-person",
  "/transmissions/unavailable-story",
];

test("all primary routes load directly and survive refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main h1")).toHaveCount(1);
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(
      /first drop|history starts here|prototype|mock|pending|first collection/i,
    );
  }
  expect(errors).toEqual([]);
});
test("missing records render usable detail templates with 404 semantics", async ({
  page,
}) => {
  for (const path of missing) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("main h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/product/unavailable-item");
  await expect(
    page.getByRole("button", { name: "Add to bag", exact: true }),
  ).toBeDisabled();
  for (const title of [
    "Fit",
    "Size guide",
    "Model height",
    "Model size worn",
    "Material",
    "Fabric weight / GSM",
    "Construction",
    "Description",
    "Product story",
    "Shipping information",
    "Returns information",
  ])
    await expect(
      page.locator("summary").filter({ hasText: title }).first(),
    ).toBeVisible();
});
test("navigation preserves query parameters and browser history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/?utm_source=city&utm_medium=editorial&utm_campaign=chapter&ref=friend&promoter=creator",
  );
  for (const [name, path] of [
    ["SHOP", "/shop"],
    ["DROPS", "/drops"],
    ["PEOPLE", "/people"],
    ["ARCHIVE", "/archive"],
    ["TRANSMISSIONS", "/transmissions"],
    ["THE CITY", "/city"],
  ]) {
    await page
      .getByRole("navigation", { name: "Primary", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/") + "\\?"));
    expect(new URL(page.url()).searchParams.get("promoter")).toBe("creator");
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/transmissions/);
  await page.goForward();
  await expect(page).toHaveURL(/city\?/);
});
test("mobile breakpoints, touch navigation and dialog focus", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [412, 915],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      String(width),
    ).toBe(true);
    const menu = page.getByRole("button", { name: "Open menu", exact: true });
    await menu.click();
    await expect(
      page.getByRole("dialog", { name: "Menu", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await menu.click();
    await page
      .getByRole("navigation", { name: "Mobile", exact: true })
      .getByRole("link", { name: "SHOP", exact: true })
      .click();
    await expect(page).toHaveURL(/shop/);
    for (const path of [
      "/shop",
      "/product/unavailable-item",
      "/people",
      "/archive",
      "/transmissions",
      "/cart",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        width + path,
      ).toBe(true);
    }
  }
});
test("join is an honest local form, cart is empty and checkout disabled", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("facade@example.com");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Enter the city →", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "has not been saved or sent",
  );
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Open bag, 0 items" }).click();
  await expect(
    page.getByRole("dialog", { name: "Bag", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Checkout", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open bag, 0 items" }),
  ).toBeFocused();
});
test("reduced motion, no WebGL, and no JavaScript preserve critical content", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto(baseURL!);
  await expect(staticPage.locator("main h1")).toBeVisible();
  await staticPage
    .getByRole("link", { name: "Shop Lock City →", exact: true })
    .first()
    .click();
  await expect(staticPage).toHaveURL(/shop/);
  await context.close();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      return String(args[0]).includes("webgl")
        ? null
        : original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-scene-gate] img").first()).toBeVisible();
});
test("WCAG automated scans across key desktop and mobile surfaces", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/shop",
      "/product/unavailable-item",
      "/people",
      "/archive",
      "/transmissions",
      "/cart",
    ]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations, width + path).toEqual([]);
    }
  }
});
test("legacy external endpoints remain disabled", async ({ request }) => {
  expect((await request.get("/store/products")).status()).toBe(503);
  expect(
    (
      await request.post("/join", {
        data: { email: "not-sent@example.com", consent: true },
      })
    ).status(),
  ).toBe(503);
});

test("desktop scene idles, resumes, releases on navigation and survives context loss", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const scene = page.locator('[data-testid="hero-section"] [data-quality]');
  await expect(scene.locator("canvas")).toHaveCount(1, { timeout: 20000 });
  await expect(scene).toHaveAttribute("data-rendering", "paused", {
    timeout: 15000,
  });
  await page.mouse.move(500, 350);
  await expect(scene).toHaveAttribute("data-rendering", "active");
  await page.locator("#join").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-testid="hero-section"] canvas')).toHaveCount(
    0,
  );
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("link", { name: "SHOP", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.goBack();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(scene.locator("canvas")).toHaveCount(1, { timeout: 20000 });
  await expect(scene.locator('canvas')).toHaveAttribute('data-engine', /three\.js/);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const contextLost = await scene
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => {
      const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      extension?.loseContext();
      return !!extension;
    });
  expect(contextLost).toBe(true);
  await expect(scene).toHaveAttribute("data-quality", "static");
  await expect(scene.locator("canvas")).toHaveCount(0);
  await expect(page.getByTestId("hero-shop-link")).toBeVisible();
});

test("preview keeps requests local and records lab resource observations", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      new URL(r.url()).origin !==
      new URL(testInfo.project.use.baseURL as string).origin
    )
      external.push(r.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  const report = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    fonts: [...document.fonts].map((f) => ({
      family: f.family,
      status: f.status,
    })),
    resources: performance.getEntriesByType("resource").map((e) => {
      const r = e as PerformanceResourceTiming;
      return {
        name: new URL(r.name).pathname,
        bytes: r.encodedBodySize,
        duration: r.duration,
      };
    }),
  }));
  await testInfo.attach("lab-resources.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
});
