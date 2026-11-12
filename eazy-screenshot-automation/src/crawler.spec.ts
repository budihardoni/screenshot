import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CRAWLER UTAMA - Menjawab 7 kebutuhan Anda:
 * 1 Dashboard & navigasi utama
 * 2 Seluruh menu & submenu
 * 3 List, detail, tambah, edit
 * 4 Modal, dropdown, tab, filter
 * 5 Form validation & feedback
 * 6 Workflow setiap modul
 * 7 Role & permission (dijalankan per project/role)
 */

const BASE_URL = process.env.BASE_URL || 'https://eazy-academic.btpdev.my.id';

// Helper: screenshot rapi + fullPage + delay
async function shot(page, filePath: string, opts: any = {}) {
  await page.waitForTimeout(800); // tunggu animasi
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled', ...opts });
  console.log(`📸 ${filePath}`);
}

// Helper: crawl semua interaksi di satu halaman
async function captureInteractions(page, basePath: string) {
  // 1. Dropdown - buka semua
  const dropdowns = page.locator('[data-bs-toggle="dropdown"], .dropdown-toggle, select');
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

  // 2. Tabs - klik semua tab
  const tabs = page.locator('[role="tab"], .nav-tabs a, .nav-pills a');
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

  // 3. Modals - klik tombol yang membuka modal (Add, Edit, Delete, Detail)
  const modalTriggers = page.locator('button:has-text("Tambah"), button:has-text("Add"), button:has-text("Edit"), button:has-text("Delete"), a:has-text("Detail")');
  for (let i = 0; i < Math.min(await modalTriggers.count(), 5); i++) {
    try {
      const btn = modalTriggers.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForSelector('.modal.show, [role="dialog"]', { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(800);
        await shot(page, `${basePath}/modal_${i}.png`);
        // tutup modal
        const closeBtn = page.locator('.modal .btn-close, .modal button:has-text("Close"), .modal button:has-text("Batal")').first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
        else await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } catch {}
  }

  // 4. Form validation - trigger dengan submit kosong
  const forms = page.locator('form');
  for (let i = 0; i < await forms.count(); i++) {
    try {
      const submit = forms.nth(i).locator('button[type="submit"], button:has-text("Simpan")').first();
      if (await submit.isVisible()) {
        await submit.click();
        await page.waitForTimeout(800);
        // jika ada pesan error validasi muncul
        const hasError = await page.locator('.invalid-feedback, .text-danger, .error').count() > 0;
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
    // set extra headers anti-block
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID' });
  });

  test('01 - Login & validation states', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Jika redirect ke dashboard (sudah login), jangan test validasi login
    if (!page.url().includes('/login')) {
      console.log('[INFO] Sudah login, skip validasi login - screenshot dashboard sebagai login');
      await shot(page, 'screenshots/01_login/login_redirected_to_dashboard.png');
      return;
    }
    await shot(page, 'screenshots/01_login/login.png');
    
    // capture validation: klik login kosong - selector spesifik
    const loginBtn = page.locator('#login-button, button.login-button');
    if (await loginBtn.isVisible().catch(()=>false)) {
      await loginBtn.click();
      await page.waitForTimeout(800);
      await shot(page, 'screenshots/01_login/login_validation_error.png');
    } else {
      console.log('[INFO] Login button tidak ada, skip validation');
    }
  });

  test('02 - Dashboard & navigasi', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/', { waitUntil: 'domcontentloaded' }));
    await shot(page, 'screenshots/02_dashboard/dashboard.png');

    // Capture sidebar expanded vs collapsed (jika ada toggle)
    const toggle = page.locator('[data-bs-toggle], .sidebar-toggle, button:has-text("☰")').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await shot(page, 'screenshots/02_dashboard/sidebar_collapsed.png');
      await toggle.click();
      await shot(page, 'screenshots/02_dashboard/sidebar_expanded.png');
    }

    // Simpan semua link menu untuk crawl berikutnya
    const menuLinks = await page.locator('nav a, aside a, .sidebar a').all();
    const urls: string[] = [];
    for (const a of menuLinks) {
      try {
        const href = await a.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('logout') && !href.includes('login')) {
          urls.push(href);
        }
      } catch {}
    }
    fs.mkdirSync('screenshots/report', { recursive: true });
    fs.writeFileSync('screenshots/report/menu-urls.json', JSON.stringify([...new Set(urls)], null, 2));
    console.log(`Found ${urls.length} menu URLs`);
  });

  test('03 - Crawl semua menu & submenu (otomatis)', async ({ page }) => {
    // Baca daftar URL dari test sebelumnya atau crawl langsung sidebar
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/', { waitUntil: 'domcontentloaded' }));
    
    // Ambil semua link menu secara dinamis (bukan hardcode)
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('nav a, aside a, .sidebar a, .menu a'));
      return anchors.map(a => ({ text: (a.textContent||'').trim(), href: a.getAttribute('href') }))
        .filter(x => x.href && x.href.startsWith('/') && !x.href.includes('logout'));
    });

    console.log(`Crawling ${links.length} pages...`);

    for (let idx = 0; idx < links.length; idx++) {
      const item = links[idx];
      const safeName = item.text.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `page_${idx}`;
      const folder = `screenshots/03_modules/${String(idx).padStart(2,'0')}_${safeName}`;
      
      try {
        await page.goto(item.href!, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1200);
        
        // 1. List view
        await shot(page, `${folder}/01_list.png`);
        
        // 2. Capture interaksi: dropdown, tab, modal, filter
        await captureInteractions(page, folder);

        // 3. Jika ada tabel, klik baris pertama untuk detail
        const firstRow = page.locator('table tbody tr').first();
        if (await firstRow.isVisible().catch(() => false)) {
          const detailBtn = firstRow.locator('a, button').first();
          if (await detailBtn.isVisible().catch(() => false)) {
            await detailBtn.click().catch(() => {});
            await page.waitForTimeout(1000);
            // jika pindah halaman detail
            if (!page.url().includes(item.href!)) {
              await shot(page, `${folder}/02_detail.png`);
              await page.goBack().catch(() => page.goto(item.href!, { waitUntil: 'domcontentloaded' }));
            }
          }
        }

        // 4. Coba buka halaman tambah (jika ada)
        const tambahBtn = page.locator('a:has-text("Tambah"), button:has-text("Tambah"), a[href*="create"], a[href*="add"]').first();
        if (await tambahBtn.isVisible().catch(() => false)) {
          const href = await tambahBtn.getAttribute('href');
          if (href) {
            await page.goto(href, { waitUntil: 'domcontentloaded' });
            await shot(page, `${folder}/03_tambah.png`);
            // trigger validation
            const submit = page.locator('button[type="submit"]').first();
            if (await submit.isVisible().catch(() => false)) {
              await submit.click();
              await page.waitForTimeout(800);
              await shot(page, `${folder}/04_tambah_validation.png`);
            }
            await page.goto(item.href!, { waitUntil: 'domcontentloaded' });
          }
        }

      } catch (e) {
        console.log(`[WARN] Gagal crawl ${item.href}: ${e}`);
        await shot(page, `${folder}/error.png`).catch(()=>{});
      }
    }
  });

  test('04 - Workflow & filter states', async ({ page }) => {
    // Contoh: filter, search, pagination
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(()=>{});
    const filterInputs = page.locator('input[type="search"], input[placeholder*="Cari"], select');
    if (await filterInputs.count() > 0) {
      await shot(page, 'screenshots/04_workflow/filter_before.png');
      const search = page.locator('input[type="search"], input[placeholder*="Cari"]').first();
      if (await search.isVisible().catch(()=>false)) {
        await search.fill('test');
        await page.waitForTimeout(1200);
        await shot(page, 'screenshots/04_workflow/filter_after_search.png');
      }
    }
  });
});
