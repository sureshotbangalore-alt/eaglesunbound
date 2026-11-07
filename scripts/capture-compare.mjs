// Captures comparable screenshots and load metrics for the public pages of one site.
// Usage: node scripts/capture-compare.mjs <baseUrl> <label>   e.g. https://eagles.ssbsureshot.in before
// Output: docs/redesign/<label>/<viewport>-<page>.png and docs/redesign/<label>/metrics.json. Read-only: it only visits pages.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium} = createRequire(import.meta.url.replace('/scripts/', '/frontend/'))('@playwright/test');

const [base, label] = process.argv.slice(2);
if (!base || !label) { console.error('Usage: node scripts/capture-compare.mjs <baseUrl> <label>'); process.exit(1); }
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/redesign', label); mkdirSync(out, {recursive: true});
const pages = (process.env.PAGES || '/,/the-bootcamp,/what-we-offer,/activities,/about,/contact,/book-now').split(',');
const viewports = {desktop: {width: 1440, height: 900}, mobile: {width: 390, height: 844, isMobile: true, hasTouch: true}};

const browser = await chromium.launch();
const metrics = {};
for (const [vpName, vp] of Object.entries(viewports)) {
  const context = await browser.newContext({viewport: {width: vp.width, height: vp.height}, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1});
  // Accept only necessary cookies so the banner does not cover the page (same choice for both captures).
  // Skip the one-time brand intro so page designs are compared (the intro is captured separately).
  await context.addInitScript(() => { try { sessionStorage.setItem('eu.intro', '1'); } catch {} });
  await context.addInitScript(() => { try { localStorage.setItem('eu.cookie-preferences', JSON.stringify({version: 1, savedAt: Date.now(), expiresAt: Date.now() + 1e10, preferences: {necessary: true, functional: true, analytics: false, marketing: false}})); } catch {} });
  for (const path of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({type: 'layout-shift', buffered: true});
      new PerformanceObserver(l => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true});
    });
    const started = Date.now();
    const response = await page.goto(base + path, {waitUntil: 'load', timeout: 60000});
    await page.waitForTimeout(1500);
    const name = path === '/' ? 'home' : path.slice(1);
    await page.screenshot({path: join(out, `${vpName}-${name}-top.png`)});
    // scroll through so scroll-triggered content is revealed, then capture the full page
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 600)); });
    await page.screenshot({path: join(out, `${vpName}-${name}-full.png`), fullPage: true});
    // Scroll-animated sections are blank in a single full-page shot, so also capture screen by screen while scrolling.
    if ((process.env.SCREENS || '').split(',').includes(path)) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let i = 0, y = 0; y < height && i < 16; i++, y += vp.height) {
        await page.evaluate(top => window.scrollTo(0, top), y); await page.waitForTimeout(1100);
        await page.screenshot({path: join(out, `${vpName}-${name}-screen${String(i + 1).padStart(2, '0')}.png`)});
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        ttfb: Math.round(nav?.responseStart || 0), domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0), load: Math.round(nav?.loadEventEnd || 0),
        lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(3)),
        transferKB: Math.round(performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        videos: document.querySelectorAll('video').length, canvases: document.querySelectorAll('canvas').length, animatedSvg: document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion, [class*="anim"]').length,
        interactive: document.querySelectorAll('a,button,[role=button],input,select,textarea').length, imagesMissingAlt: document.querySelectorAll('img:not([alt])').length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    metrics[`${vpName} ${path}`] = {status: response?.status(), wallMs: Date.now() - started, ...m, consoleErrors: errors};
    await page.close();
  }
  await context.close();
}
await browser.close();
writeFileSync(join(out, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 1).slice(0, 4000));
