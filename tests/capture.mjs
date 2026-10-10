import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const dir = "qa-captures/first";
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.locator("#poster svg").waitFor();
for (const width of [1440, 390, 768]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.screenshot({ path: `${dir}/${width}.png`, fullPage: true });
}
console.log(JSON.stringify({ errors, title: await page.title() }, null, 2));
await browser.close();
