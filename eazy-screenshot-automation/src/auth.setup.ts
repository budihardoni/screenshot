import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://eazy-academic.btpdev.my.id';

// MODE SUPER ADMIN - hanya 1 akun yang punya akses semua role
setup('authenticate as super-admin', async ({ page }) => {
  const username = process.env.SUPERADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  console.log(`[DEBUG] ENV check: BASE_URL=${BASE_URL}, USERNAME exists=${!!username}, PASSWORD exists=${!!password}`);
  console.log(`[DEBUG] Available env keys:`, Object.keys(process.env).filter(k => k.includes('ADMIN') || k.includes('BASE') || k.includes('USER')));

  if (!username || !password) {
    console.error('❌ Kredensial kosong! Pastikan GitHub Secrets berisi: SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, BASE_URL');
    console.error('   Current: SUPERADMIN_USERNAME=', process.env.SUPERADMIN_USERNAME, 'ADMIN_USERNAME=', process.env.ADMIN_USERNAME);
    // Try alternative names for backward compatibility
    const altUser = process.env.USERNAME || process.env.USER || process.env.SUPER_ADMIN_USERNAME;
    const altPass = process.env.PASSWORD || process.env.PASS || process.env.SUPER_ADMIN_PASSWORD;
    if (altUser && altPass) {
      console.log('[RETRY] Mencoba dengan alt env:', altUser);
    } else {
      throw new Error('SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD belum diisi di GitHub Secrets. Cek Settings > Secrets > Actions - harus exact huruf besar. Lihat .env.example');
    }
  }

  console.log(`[LOGIN] Mencoba login sebagai Super Admin: ${username}`);

  // Bypass Cloudflare: tunggu sampai form login benar-benar muncul
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  
  // Cloudflare challenge bisa 3-5 detik, tunggu selector password
  try {
    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 30000 });
  } catch {
    console.log('[WARN] Selector password tidak muncul, coba tunggu 5 detik lagi (CF challenge)');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/00_debug_login_page.png', fullPage: true });
  }

  const userField = page.locator('input[name="username"], input[name="email"], input[type="text"]').first();
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  
  await userField.fill(username);
  await passField.fill(password);

  await page.locator('button:has-text("Login"), button[type="submit"]').first().click();
  
  // Tunggu redirect keluar dari /login
  await page.waitForFunction(() => !window.location.href.includes('/login'), null, { timeout: 20000 }).catch(async () => {
    await page.screenshot({ path: 'screenshots/00_login_failed.png', fullPage: true });
    throw new Error('Login gagal - masih di halaman login. Cek kredensial atau CAPTCHA.');
  });

  console.log(`[OK] Login Super Admin berhasil -> ${page.url()}`);
  await page.context().storageState({ path: 'config/storage-superadmin.json' });
  console.log('[OK] Session disimpan ke config/storage-superadmin.json (anti-block untuk crawl berikutnya)');
});
