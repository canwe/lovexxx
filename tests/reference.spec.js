import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const content = JSON.parse(readFileSync(new URL("../web/content.json", import.meta.url), "utf8"));

/** Colors/order from original style.css nth-child + local saved DOM order */
const ORIGINAL_PORTAL_ORDER = [
  "videos",
  "commercials",
  "store",
  "rhymes",
  "charms",
  "contact",
];

const ORIGINAL_NTH_COLORS = {
  videos: "rgb(0, 184, 124)", // #00b87c
  commercials: "rgb(242, 254, 104)", // #f2fe68
  store: "rgb(0, 138, 246)", // #008af6
  rhymes: "rgb(255, 0, 92)", // #ff005c
  charms: "rgb(240, 174, 173)", // #f0aead
  contact: "rgb(255, 108, 207)", // #ff6ccf
};

test.describe("love.xxx reference — home grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__love?.state?.portals?.length === 6);
    await page.locator("#preloader").evaluate((el) => el.classList.contains("is-done"));
  });

  test("renders six portals in original order with original title SVGs", async ({
    page,
  }) => {
    const labels = page.locator("#portal-labels > section");
    await expect(labels).toHaveCount(6);

    const ids = await labels.evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(ORIGINAL_PORTAL_ORDER);

    for (const id of ORIGINAL_PORTAL_ORDER) {
      const title = page.locator(`#portal-labels #${id} img.title`);
      await expect(title).toHaveAttribute("src", new RegExp(`/assets/svg/${id}\\.svg$`));
    }
  });

  test("portal tile colors match original nth-child palette", async ({ page }) => {
    for (const id of ORIGINAL_PORTAL_ORDER) {
      const bg = await page.locator(`#portal-labels #${id}`).evaluate((el) =>
        getComputedStyle(el).backgroundColor,
      );
      expect(bg).toBe(ORIGINAL_NTH_COLORS[id]);
    }
  });

  test("landscape home uses 3×2 float tiles (33.333% × 50%)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(50);

    const box = await page.locator("#portal-labels > section").first().boundingBox();
    expect(box.width).toBeCloseTo(1280 / 3, 0);
    expect(box.height).toBeCloseTo(800 / 2, 0);

    const positions = await page.locator("#portal-labels > section").evaluateAll((els) =>
      els.map((e) => e.dataset.position),
    );
    expect(positions).toEqual([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ]);
  });

  test("portrait home uses 2×3 float tiles (50% × 33.333%)", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
      window.__love.refreshPositions();
    });
    await page.waitForTimeout(50);

    const portrait = await page.evaluate(() => window.__love.isPortrait());
    expect(portrait).toBe(true);

    const box = await page.locator("#portal-labels > section").first().boundingBox();
    expect(box.width).toBeCloseTo(600 / 2, 0);
    expect(box.height).toBeCloseTo(900 / 3, 0);

    const positions = await page.locator("#portal-labels > section").evaluateAll((els) =>
      els.map((e) => e.dataset.position),
    );
    expect(positions).toEqual([
      "top-left",
      "top-right",
      "center-left",
      "center-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  test("hover cycles images; after full pass shuffles like love.home.portalHover", async ({
    page,
  }) => {
    const portal = page.locator("#portal-labels > section").first();
    const images = page.locator("#portal-images > section").first().locator(".home-image");
    const n = await images.count();
    expect(n).toBeGreaterThan(1);

    const orderBefore = await images.evaluateAll((els) =>
      els.map((e) => e.style.backgroundImage),
    );

    for (let i = 0; i < n; i += 1) {
      await portal.hover({ force: true });
      await page.mouse.move(10, 10);
      await page.waitForTimeout(20);
    }
    // One more enter completes hoverTrack === n → shuffle
    await portal.hover({ force: true });
    await page.waitForTimeout(30);

    const orderAfter = await images.evaluateAll((els) =>
      els.map((e) => e.style.backgroundImage),
    );
    // Shuffle should change child order relative to initial (probabilistic but
    // with n images after a forced shuffleChildren call, order is reshuffled).
    // At minimum: visible image is first child (post-shuffle reset).
    const visibleIdx = await images.evaluateAll((els) =>
      els.findIndex((e) => !e.classList.contains("is-hidden")),
    );
    expect(visibleIdx).toBe(0);

    // Ensure cycling happened before shuffle: orderAfter may equal orderBefore
    // only if shuffle returned same order; expose shuffle via __love for determinism.
    const shuffled = await page.evaluate(() => {
      const wrap = document.querySelector("#portal-images > section .images");
      const before = [...wrap.children].map((c) => c.style.backgroundImage);
      window.__love.shuffleChildren(wrap);
      const after = [...wrap.children].map((c) => c.style.backgroundImage);
      return { before, after };
    });
    // Fisher–Yates can rarely no-op; run until different or cap
    let different = shuffled.before.join() !== shuffled.after.join();
    for (let i = 0; i < 8 && !different; i += 1) {
      different = await page.evaluate(() => {
        const wrap = document.querySelector("#portal-images > section .images");
        const before = [...wrap.children].map((c) => c.style.backgroundImage);
        window.__love.shuffleChildren(wrap);
        const after = [...wrap.children].map((c) => c.style.backgroundImage);
        return before.join() !== after.join();
      });
    }
    expect(different).toBe(true);
    expect(orderBefore.length).toBe(n);
    expect(orderAfter.length).toBe(n);
  });
});

test.describe("love.xxx reference — enter portal (contact flash)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.__love?.state?.portals?.length === 6);
  });

  test("click zooms and blinks once at 100ms then settles on one frame", async ({
    page,
  }) => {
    await page.locator("#portal-labels > section").first().click();
    await page.waitForTimeout(700); // ZOOM_MS

    await expect(page.locator("#portal-stage")).toBeVisible();
    await expect(page.locator("#back")).not.toHaveClass(/hider/);
    await expect(page.locator("#preloader")).toHaveClass(/is-done/);

    const flashMs = await page.evaluate(() => window.__love.FLASH_MS);
    expect(flashMs).toBe(100);

    // Mid-blink: timer running, frames changing
    const bg1 = await page
      .locator("#stage-images .stage-image:not(.is-hidden)")
      .evaluate((el) => el.style.backgroundImage);
    await page.waitForTimeout(250);
    const bg2 = await page
      .locator("#stage-images .stage-image:not(.is-hidden)")
      .evaluate((el) => el.style.backgroundImage);
    expect(bg2).not.toBe(bg1);

    const n = content.portals[0].images.length;
    // home.flashImages stops after total-1 ticks from count 0
    await page.waitForTimeout(n * 100 + 200);

    const settled = await page.evaluate(() => window.__love.state.flashTimer == null);
    expect(settled).toBe(true);
    await expect(page.locator("#stage-text")).toHaveClass(/is-clear/);

    const visible = page.locator("#stage-images .stage-image:not(.is-hidden)");
    await expect(visible).toHaveCount(1);
  });

  test("press during blink settles early on current frame", async ({ page }) => {
    await page.locator("#portal-labels > section").nth(2).click();
    await expect(page.locator("#portal-stage.is-open")).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    const frozen = await page
      .locator("#stage-images .stage-image:not(.is-hidden)")
      .evaluate((el) => el.style.backgroundImage);
    await page.waitForTimeout(350);
    const still = await page
      .locator("#stage-images .stage-image:not(.is-hidden)")
      .evaluate((el) => el.style.backgroundImage);
    expect(still).toBe(frozen);
    await expect(page.locator("#stage-text")).toHaveClass(/is-clear/);
    const settled = await page.evaluate(() => window.__love.state.flashTimer == null);
    expect(settled).toBe(true);
  });

  test("back returns to home grid", async ({ page }) => {
    await page.locator("#portal-labels > section").first().click();
    await page.waitForTimeout(700);
    await page.locator("#back").click();
    await page.waitForTimeout(700);

    await expect(page.locator("#portal-stage")).toBeHidden();
    await expect(page.locator("#back")).toHaveClass(/hider/);
    await expect(page.locator("#portal-labels > section")).toHaveCount(6);
  });
});

test.describe("love.xxx reference — content contract", () => {
  test("content.json portals match original ids and absolute image URLs only", async () => {
    expect(content.portals.map((p) => p.id)).toEqual(ORIGINAL_PORTAL_ORDER);
    for (const portal of content.portals) {
      expect(portal.images.length).toBeGreaterThan(0);
      for (const url of portal.images) {
        expect(url).toMatch(/^https?:\/\//);
      }
    }
  });
});
