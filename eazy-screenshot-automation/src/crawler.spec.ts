import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://eazy-academic.btpdev.my.id';

async function shot(page, filePath: string, opts: any = {}) {
  await page.waitForTimeout(800);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled', ...opts });
  console.log(`📸 ${filePath}`);
}

async function captureInteractions(page, basePath: string) {
  const dropdowns = page.locator('[data-bs-toggle="dropdown"], .dropdown-toggle, select, [role="combobox"]');
  for (let i = 0; i < await dropdowns.count(); i++) {
    try {
      const el = dropdowns.nth(i);
      if (await el.isVisible()) {
        await el.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        await shot(page, `${basePath}/dropdown_${i}.png`);
        await page.keyboard.press('Escape');
      }
    } catch {}
  }
  const tabs = page.locator('[role="tab"], .nav-tabs a, .nav-pills a, .tabs a');
  for (let i = 0; i < await tabs.count(); i++) {
    try {
      const t = tabs.nth(i);
      if (await t.isVisible()) {
        await t.click();
        await page.waitForTimeout(700);
        await shot(page, `${basePath}/tab_${i}.png`);
      }
    } catch {}
  }
  const modalTriggers = page.locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Edit"), button:has-text("Delete"), a:has-text("Detail"), button:has-text("Lihat")');
  for (let i = 0; i < Math.min(await modalTriggers.count(), 5); i++) {
    try {
      const btn = modalTriggers.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForSelector('.modal.show, [role="dialog"], .modal', { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(800);
        await shot(page, `${basePath}/modal_${i}.png`);
        const closeBtn = page.locator('.modal .btn-close, .modal button:has-text("Close"), .modal button:has-text("Batal"), .btn-close').first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
        else await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } catch {}
  }
  const forms = page.locator('form');
  for (let i = 0; i < await forms.count(); i++) {
    try {
      const submit = forms.nth(i).locator('button[type="submit"], button:has-text("Simpan"), button:has-text("Save")').first();
      if (await submit.isVisible()) {
        await submit.click();
        await page.waitForTimeout(800);
        const hasError = await page.locator('.invalid-feedback, .text-danger, .error, [role="alert"]').count() > 0;
        if (hasError) {
          await shot(page, `${basePath}/form_validation_${i}.png`);
        }
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    } catch {}
  }
}

test.describe('Eazy Academic - Full Screenshot Crawl', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID' });
  });

  test('01 - Login & validation states', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    if (!page.url().includes('/login')) {
      console.log('[INFO] Sudah login, skip validasi login');
      await shot(page, 'screenshots/01_login/login_redirected_to_dashboard.png');
      return;
    }
    await shot(page, 'screenshots/01_login/login.png');
    const loginBtn = page.locator('#login-button, button.login-button');
    if (await loginBtn.isVisible().catch(()=>false)) {
      await loginBtn.click();
      await page.waitForTimeout(800);
      await shot(page, 'screenshots/01_login/login_validation_error.png');
    }
  });

  test('02 - Dashboard & navigasi', async ({ page }) => {
    // Buka dashboard dengan wait lebih lama untuk SPA
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/', { waitUntil: 'domcontentloaded' }));
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(3000);
    await shot(page, 'screenshots/02_dashboard/dashboard.png');

    // Coba expand/collapse sidebar
    const toggleSelectors = ['[data-bs-toggle]', '.sidebar-toggle', '.menu-toggle', 'button:has-text("☰")', '.bx-menu', '#sidebar-toggle'];
    for (const sel of toggleSelectors) {
      const toggle = page.locator(sel).first();
      if (await toggle.isVisible().catch(() => false)) {
        console.log(`[INFO] Found toggle: ${sel}`);
        await toggle.click().catch(()=>{});
        await page.waitForTimeout(1000);
        await shot(page, 'screenshots/02_dashboard/sidebar_toggled.png');
        break;
      }
    }

    // COMPREHENSIVE MENU DISCOVERY - lebih luas
    const allLinks = await page.evaluate(() => {
      // Ambil semua anchor + element dengan href/data-href
      const anchors = Array.from(document.querySelectorAll('a[href], [data-href], [data-url]'));
      const data = anchors.map(a => {
        const href = a.getAttribute('href') || a.getAttribute('data-href') || a.getAttribute('data-url') || '';
        const text = (a.textContent || a.getAttribute('title') || '').trim().replace(/\s+/g,' ').slice(0,50);
        const visible = (a as HTMLElement).offsetParent !== null;
        return { href, text, visible, tag: a.tagName, class: a.className.slice(0,80) };
      }).filter(x => {
        if (!x.href) return false;
        // Filter hanya internal
        if (x.href.startsWith('http') && !x.href.includes(window.location.hostname)) return false;
        if (x.href.startsWith('#') || x.href.startsWith('javascript:')) return false;
        if (x.href.includes('logout') || x.href.includes('login') || x.href.includes('password')) return false;
        // Hanya yang terlihat atau di menu (kecuali pagination)
        return true;
      });
      // Deduplicate by href
      const seen = new Set();
      const uniq = [];
      for (const d of data) {
        if (!seen.has(d.href)) { seen.add(d.href); uniq.push(d); }
      }
      // Also capture full HTML for debug
      return { links: uniq, htmlSnippet: document.documentElement.outerHTML.slice(0,2000), bodyClasses: document.body.className, navCount: document.querySelectorAll('nav').length };
    });

    console.log(`[DEBUG] Found ${allLinks.links.length} total links`);
    console.log(JSON.stringify(allLinks.links.slice(0,20), null, 2));
    console.log(`[DEBUG] bodyClasses: ${allLinks.bodyClasses}, navCount: ${allLinks.navCount}`);

    // Simpan semua link
    fs.mkdirSync('screenshots/report', { recursive: true });
    fs.writeFileSync('screenshots/report/menu-urls.json', JSON.stringify(allLinks.links, null, 2));
    fs.writeFileSync('screenshots/report/dashboard-debug.json', JSON.stringify(allLinks, null, 2));
    console.log(`Found ${allLinks.links.length} menu URLs`);

    // Coba klik parent menu untuk expand submenu (jika ada)
    const parentMenus = page.locator('.has-submenu, .menu-item.has-children, .nav-item.dropdown, [aria-haspopup="true"]');
    console.log(`[INFO] Found ${await parentMenus.count()} parent menus with submenu`);
    for (let i=0; i < Math.min(await parentMenus.count(), 5); i++) {
      try {
        const pm = parentMenus.nth(i);
        if (await pm.isVisible()) {
          await pm.click().catch(()=>{});
          await page.waitForTimeout(800);
          await shot(page, `screenshots/02_dashboard/submenu_${i}.png`);
        }
      } catch {}
    }

    // Screenshot expanded sidebar state
    await page.evaluate(() => window.scrollTo(0,0));
    await shot(page, 'screenshots/02_dashboard/dashboard_full.png');
  });

  test('03 - Crawl semua menu & submenu (otomatis)', async ({ page }) => {
    // Baca dari report jika ada, fallback ke evaluasi langsung
    let links: any[] = [];
    try {
      if (fs.existsSync('screenshots/report/menu-urls.json')) {
        links = JSON.parse(fs.readFileSync('screenshots/report/menu-urls.json','utf-8'));
        console.log(`[INFO] Loaded ${links.length} links from previous test`);
      }
    } catch {}

    if (links.length === 0) {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/', { waitUntil: 'domcontentloaded' }));
      await page.waitForTimeout(3000);
      links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => ({ text: (a.textContent||'').trim(), href: a.getAttribute('href') }))
          .filter(x => x.href && (x.href.startsWith('/') || x.href.startsWith(window.location.origin)) && !x.href.includes('logout') && !x.href.includes('login'));
      });
    }

    // Filter hanya path internal yang unik dan bukan asset
    links = links.filter(l => {
      const h = l.href;
      return !h.endsWith('.css') && !h.endsWith('.js') && !h.endsWith('.png') && !h.endsWith('.jpg') && h.length > 1;
    });
    // Deduplicate
    const seen = new Set();
    links = links.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });
    // Batasi 30 teratas untuk efisiensi (bisa diubah ke unlimited)
    // links = links.slice(0, 30);

    console.log(`Crawling ${links.length} pages...`);
    fs.writeFileSync('screenshots/report/crawl-plan.json', JSON.stringify(links, null, 2));

    for (let idx = 0; idx < links.length; idx++) {
      const item = Object.assign({ text: `page_${idx}` }, links[idx]);
      const safeName = item.text.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0,30) || `page_${idx}`;
      const folder = `screenshots/03_modules/${String(idx).padStart(2,'0')}_${safeName}`;
      
      try {
        const target = item.href.startsWith('http') ? item.href : `${BASE_URL}${item.href.startsWith('/') ? '' : '/'}${item.href}`;
        console.log(`[${idx+1}/${links.length}] Crawling ${item.href} -> ${folder}`);
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(async () => {
          await page.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(()=>{});
        });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
        await page.waitForTimeout(1200);
        
        await shot(page, `${folder}/01_list.png`);
        await captureInteractions(page, folder);

        const firstRow = page.locator('table tbody tr').first();
        if (await firstRow.isVisible().catch(() => false)) {
          const detailBtn = firstRow.locator('a, button').first();
          if (await detailBtn.isVisible().catch(() => false)) {
            await detailBtn.click().catch(() => {});
            await page.waitForTimeout(1000);
            if (!page.url().includes(item.href)) {
              await shot(page, `${folder}/02_detail.png`);
              await page.goBack().catch(() => page.goto(target, { waitUntil: 'domcontentloaded' }));
            }
          }
        }

        const tambahBtn = page.locator('a:has-text("Tambah"), button:has-text("Tambah"), a[href*="create"], a[href*="add"], a:has-text("Create")').first();
        if (await tambahBtn.isVisible().catch(() => false)) {
          const href = await tambahBtn.getAttribute('href');
          if (href) {
            const createUrl = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/')?'':'/'}${href}`;
            await page.goto(createUrl, { waitUntil: 'domcontentloaded' });
            await shot(page, `${folder}/03_tambah.png`);
            const submit = page.locator('button[type="submit"]').first();
            if (await submit.isVisible().catch(() => false)) {
              await submit.click();
              await page.waitForTimeout(800);
              await shot(page, `${folder}/04_tambah_validation.png`);
            }
            await page.goto(target, { waitUntil: 'domcontentloaded' });
          }
        }

      } catch (e) {
        console.log(`[WARN] Gagal crawl ${item.href}: ${e}`);
        await shot(page, `${folder}/error.png`).catch(()=>{});
      }
    }
  });

  test('04 - Workflow & filter states', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(()=>{});
    await page.waitForTimeout(2000);
    const filterInputs = page.locator('input[type="search"], input[placeholder*="Cari"], input[placeholder*="Search"], select');
    if (await filterInputs.count() > 0) {
      await shot(page, 'screenshots/04_workflow/filter_before.png');
      const search = page.locator('input[type="search"], input[placeholder*="Cari"], input[placeholder*="Search"]').first();
      if (await search.isVisible().catch(()=>false)) {
        await search.fill('test');
        await page.waitForTimeout(1200);
        await shot(page, 'screenshots/04_workflow/filter_after_search.png');
      }
    }
  });
});
