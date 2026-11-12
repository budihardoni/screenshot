/**
 * Alternatif: Playwright + Stealth (jika Cloudflare sangat ketat)
 * Jalankan: node run-stealth.cjs
 * Ini bypass paling efektif tanpa ter-block
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({
    headless: false, // headless: 'new' lebih stealth, tapi false lebih aman untuk CF
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  console.log('Opening login...');
  await page.goto('https://eazy-academic.btpdev.my.id/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshots/test_login.png', fullPage: true });
  console.log('Screenshot saved. Check for CF challenge.');
  
  // Jika muncul CF Turnstile, tunggu manual 10 detik
  await page.waitForTimeout(10000);
  await browser.close();
})();
