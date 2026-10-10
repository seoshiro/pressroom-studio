import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
const base = process.env.QA_URL || "http://127.0.0.1:5173";
const folder = process.env.QA_FOLDER || "qa-captures/final";
await fs.mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : "chrome",
  headless: true,
});
const report = {
  base,
  at: new Date().toISOString(),
  checks: [],
  viewports: [],
  errors: [],
  exports: [],
};
const check = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
async function ready(page) {
  await page.goto(base);
  await page.locator("#poster svg").waitFor();
}
async function axe(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await fs.writeFile(
    `${folder}/axe-${name}.json`,
    JSON.stringify(result.violations, null, 2),
  );
  expect(result.violations, `axe ${name}`).toEqual([]);
  check(`axe ${name}: zero WCAG A/AA violations`);
}
async function exportFile(page, kind, name) {
  const promise = page.waitForEvent("download");
  await page.locator(`[data-export="${kind}"]`).first().click();
  const download = await promise;
  const path = `${folder}/${name}.${kind}`;
  await download.saveAs(path);
  report.exports.push(path);
  return path;
}
try {
  for (const [width, height] of [
    [1366, 900],
    [1440, 900],
    [1920, 1080],
    [360, 800],
    [390, 844],
    [768, 1024],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      hasTouch: width <= 768,
      isMobile: width < 620,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") report.errors.push(m.text());
    });
    await ready(page);
    expect(
      await page
        .locator('#poster [data-ink="2"] path')
        .nth(2)
        .evaluate((el) => el.getBBox().width),
    ).toBeGreaterThan(550);
    expect(
      await page
        .locator("[id]")
        .evaluateAll(
          (els) => new Set(els.map((el) => el.id)).size === els.length,
        ),
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `${folder}/ru-${width}.png`,
      fullPage: true,
    });
    await page.locator("#language").click();
    await expect(page.locator("h1")).toHaveText("Make an impression.");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `${folder}/en-${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      await page.locator("#mobile-controls").tap();
      await page.locator("#title").fill("ПРИВЕТ\nМИР");
      await expect(page.locator("#glyph-warning")).toBeHidden();
      expect(await page.locator(".mobile-dock").isVisible()).toBeFalsy();
      await page.locator("#tab-colour").tap();
      await expect(page.locator("#panel-colour")).toBeVisible();
      await page.locator('[data-palette="1"]').tap();
      await expect(page.locator('[data-palette="1"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      check("390 touch edit, palette and keyboard-safe dock");
    }
    report.viewports.push({
      width,
      height,
      overflow: false,
      touch: width <= 768,
    });
    await ctx.close();
  }
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  await ready(page);
  await axe(page, "desktop-text");
  await page.locator("#works-button").click();
  await expect(page.locator(".empty")).toBeVisible();
  await axe(page, "empty-collection");
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).not.toBeVisible();
  check("empty collection and Escape focus return");
  await page.locator("#help-button").click();
  await expect(page.locator(".guide li")).toHaveCount(3);
  await axe(page, "help");
  await page.keyboard.press("Escape");
  await page.locator("#tab-text").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-colour")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    await page
      .locator("#tab-colour")
      .evaluate((el) => el === document.activeElement),
  ).toBeTruthy();
  await axe(page, "ink-controls");
  await page.locator('[data-palette="2"]').click();
  expect(
    await page
      .locator('[data-palette="2"]')
      .evaluate((el) => el === document.activeElement),
  ).toBeTruthy();
  await page.locator('[data-layer="1"]').uncheck();
  await expect(page.locator('#poster [data-ink="1"]')).toHaveCount(0);
  await page.locator('[data-layer="1"]').check();
  check("ink separation and palette update");
  await page.locator("#tab-text").click();
  const title = "ЖИВАЯ\nФОРМА — Й Ё & É Ω";
  await page.locator("#title").fill(title);
  await expect(page.locator("#glyph-warning")).toBeHidden();
  await page
    .locator("#subtitle")
    .fill("Авторская выставка / A graphic exploration");
  await page.locator("#note").fill("ALMATY • 2026 / № 01");
  const long =
    "Очень длинное название для проверки композиции и безопасного экспорта "
      .repeat(3)
      .slice(0, 160);
  await page.locator("#title").fill(long);
  await page
    .locator("#subtitle")
    .fill("<img src=x onerror=alert(1)> & Открытая мастерская");
  await expect(page.locator("#poster img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  check("160-character title, Cyrillic, punctuation and harmless HTML text");
  await page.locator("#title").fill(title);
  await page
    .locator("#subtitle")
    .fill("Авторская выставка / A graphic exploration");
  const svgs = new Set();
  for (const template of ["forma", "type", "exhibit", "wave", "cut"]) {
    await page.locator(`[data-template="${template}"]`).click();
    await expect(page.locator("#title")).toHaveValue(title);
    svgs.add(await page.locator("#poster").innerHTML());
    await page.screenshot({
      path: `${folder}/template-${template}.png`,
      fullPage: true,
    });
  }
  expect(svgs.size).toBe(5);
  check("five distinct templates preserve custom text");
  await page.locator('[data-template="forma"]').click();
  for (const format of ["square", "landscape", "portrait"]) {
    await page.locator("#format").selectOption(format);
    await expect(page.locator("#poster svg")).toHaveAttribute(
      "viewBox",
      format === "square"
        ? "0 0 800 800"
        : format === "landscape"
          ? "0 0 1000 700"
          : "0 0 700 990",
    );
  }
  check("three print formats");
  const initialSeed = await page.locator("#seed").textContent();
  await page.locator("#shuffle").click();
  const nextSeed = await page.locator("#seed").textContent();
  expect(nextSeed).not.toBe(initialSeed);
  await page.keyboard.press("Control+z");
  await expect(page.locator("#seed")).toHaveText(initialSeed);
  await page.keyboard.press("Control+Shift+z");
  await expect(page.locator("#seed")).toHaveText(nextSeed);
  check("keyboard undo / redo");
  await page.locator("#language").click();
  await expect(page.locator("#title")).toHaveValue(title);
  await page.locator("#save").click();
  await page.reload();
  await page.locator("#poster svg").waitFor();
  await expect(page.locator("#title")).toHaveValue(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("#works-button").click();
  await expect(page.locator("[data-open]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  check("saved work, auto-draft and language survive reload");
  await page.locator("#reset").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#title")).toHaveValue(title);
  await page.locator("#reset").click();
  await page.locator("#confirm").click();
  await expect(page.locator("#title")).toHaveValue("FORM\n& FEEL");
  await page.locator("#undo").click();
  await expect(page.locator("#title")).toHaveValue(title);
  check("protected reset and undo");
  await page.locator("#tab-press").click();
  await axe(page, "print-controls");
  for (const [id, n] of [
    ["registration", 10],
    ["grain", 35],
    ["halftone", 65],
  ]) {
    await page.locator("#" + id).focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < n; i++) await page.keyboard.press("ArrowRight");
  }
  const jsonPath = await exportFile(page, "json", "roundtrip");
  const doc = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  expect(doc.title).toBe(title);
  expect(doc.registration).toBe(10);
  await page.locator("#file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"title":"broken"}'),
  });
  await expect(page.locator("#toast")).toContainText("Cannot open");
  await page.locator("#file").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(32769, 32),
  });
  await expect(page.locator("#toast")).toContainText("Cannot open");
  await page.locator("#file").setInputFiles(jsonPath);
  await page.locator("#confirm").click();
  await expect(page.locator("#title")).toHaveValue(title);
  const localDoc = await page.evaluate(
    () => JSON.parse(localStorage.getItem("pressroom.v1")).doc,
  );
  expect(localDoc).toEqual(doc);
  check("invalid / oversized import rejected; JSON exact roundtrip");
  await page.locator("#tab-press").click();
  const svgPath = await exportFile(page, "svg", "outlined-poster");
  const pngPath = await exportFile(page, "png", "high-resolution-poster");
  const svg = await fs.readFile(svgPath, "utf8");
  expect(svg).not.toContain("<text");
  expect(svg).not.toContain("http://127");
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  const png = PNG.sync.read(await fs.readFile(pngPath));
  expect([png.width, png.height]).toEqual([2100, 2970]);
  const preview = await page.evaluate(async () => {
    const svg = document.querySelector("#poster").innerHTML;
    const img = new Image();
    img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 2100;
    c.height = 2970;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    return c.toDataURL("image/png").split(",")[1];
  });
  const expected = PNG.sync.read(Buffer.from(preview, "base64"));
  expect(Buffer.compare(png.data, expected.data)).toBe(0);
  check(
    "decoded PNG 2100 × 2970 matches preview pixel-for-pixel; SVG text outlined",
  );
  for (const [format, w, h] of [
    ["square", 2400, 2400],
    ["landscape", 3000, 2100],
  ]) {
    await page.locator("#tab-text").click();
    await page.locator("#format").selectOption(format);
    await page.locator("#tab-press").click();
    const path = await exportFile(page, "png", `export-${format}`);
    const image = PNG.sync.read(await fs.readFile(path));
    expect([image.width, image.height]).toEqual([w, h]);
    const snapshot = await page.evaluate(
      async ({ w, h }) => {
        const img = new Image();
        img.src = URL.createObjectURL(
          new Blob([document.querySelector("#poster").innerHTML], {
            type: "image/svg+xml",
          }),
        );
        await img.decode();
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        return c.toDataURL().split(",")[1];
      },
      { w, h },
    );
    expect(
      Buffer.compare(
        image.data,
        PNG.sync.read(Buffer.from(snapshot, "base64")).data,
      ),
    ).toBe(0);
  }
  await page.locator("#tab-text").click();
  await page.locator("#format").selectOption("portrait");
  await page.locator("#tab-press").click();
  check(
    "square and landscape decoded exports match their preview at full resolution",
  );
  await page.locator("#print").click();
  await expect(page.locator("#modal")).toBeVisible();
  await expect(page.locator("#modal")).toContainText("Fresh off the press.");
  await axe(page, "finished-print");
  await page.screenshot({ path: `${folder}/finished.png`, fullPage: true });
  await page.keyboard.press("Escape");
  check("reduced motion print and finished-view keyboard");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#print").click();
  await page.locator("#print").evaluate((b) => {
    b.click();
    b.click();
  });
  await expect(page.locator("#modal")).toBeVisible();
  await expect(page.locator("#modal .finished-poster")).toHaveCount(1);
  await page.keyboard.press("Escape");
  check("animated print and repeated clicks produce one print");
  await ctx.close();
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("denied", "SecurityError");
    };
  });
  const dp = await denied.newPage();
  await ready(dp);
  await dp.locator("#title").fill("LOCAL WORK");
  await expect(dp.locator("#status")).toContainText("Память недоступна");
  await expect(dp.locator("#poster svg")).toBeVisible();
  await denied.close();
  check("storage denied retains in-memory editing and warns honestly");
  const quota = await browser.newContext();
  await quota.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  const qp = await quota.newPage();
  await ready(qp);
  await qp.locator("#shuffle").click();
  await expect(qp.locator("#status")).toContainText("Память недоступна");
  await quota.close();
  check("quota failure warns without breaking composition");
  const font = await browser.newContext();
  await font.route("**/fonts/Display.ttf", (r) => r.abort());
  const fp = await font.newPage();
  await fp.goto(base);
  await expect(fp.locator("#retry")).toBeVisible();
  await font.unroute("**/fonts/Display.ttf");
  await fp.locator("#retry").click();
  await fp.locator("#poster svg").waitFor();
  await font.close();
  check("font failure and recovery");
  const failure = await browser.newContext();
  await failure.addInitScript(() => {
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(null);
    };
  });
  const ep = await failure.newPage();
  await ready(ep);
  await ep.locator("#tab-press").click();
  await ep.locator('[data-export="png"]').click();
  await expect(ep.locator("#toast")).toContainText("Не удалось скачать");
  await expect(ep.locator('[data-export="json"]')).toBeEnabled();
  await failure.close();
  check("PNG encoder failure recovers controls and offers JSON");
  const extra = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const xp = await extra.newPage();
  await ready(xp);
  await axe(xp, "mobile");
  await xp.locator("#title").fill("FORM 🦄");
  await expect(xp.locator("#glyph-warning")).toContainText("🦄");
  await xp.locator("#title").fill("FORM");
  await xp.locator("#tab-colour").click();
  for (const i of [0, 1, 2]) await xp.locator(`[data-layer="${i}"]`).uncheck();
  await expect(xp.locator("#glyph-warning")).toContainText("Все слои");
  await expect(xp.locator("#poster [data-ink]")).toHaveCount(0);
  await extra.close();
  check("mobile accessibility, unsupported-symbol warning and empty-ink state");
  const collection = await browser.newContext();
  const cp = await collection.newPage();
  await ready(cp);
  for (let i = 0; i < 13; i++) await cp.locator("#save").click();
  await expect(cp.locator("#toast")).toContainText("Коллекция заполнена");
  await cp.locator("#works-button").click();
  await expect(cp.locator("[data-open]")).toHaveCount(12);
  await cp.locator('[data-delete="0"]').click();
  await cp.locator("#confirm").click();
  await expect(cp.locator("[data-open]")).toHaveCount(11);
  await cp.locator('[data-open="0"]').click();
  await expect(cp.locator("#poster svg")).toBeVisible();
  await collection.close();
  check("12-work quota, protected deletion and reopening");
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("pressroom.v1", "{broken"),
  );
  const bp = await corrupt.newPage();
  await ready(bp);
  await expect(bp.locator("#toast")).toContainText("повреждён");
  await expect(bp.locator("#poster svg")).toBeVisible();
  await corrupt.close();
  check("corrupt stored draft safely recovers an example");
  expect(report.errors).toEqual([]);
  check("no uncaught browser errors");
} catch (e) {
  report.failure = String(e);
  throw e;
} finally {
  await fs.writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
