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

  // Handle WAF fingerprint (5s) + Cloudflare - situs ini pakai WAF yang reload 3s
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  console.log(`[INFO] Current URL after goto: ${page.url()}`);
  // WAF fingerprint butuh 3-5 detik reload, tunggu network idle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => console.log('[INFO] networkidle timeout, lanjut'));
  await page.waitForTimeout(4000);
  console.log(`[INFO] After WAF wait URL: ${page.url()}`);

  // Tunggu form login asli (bukan WAF page) - selector spesifik dari HTML asli
  try {
    await page.waitForSelector('#username, #password, #login-form', { timeout: 30000 });
    console.log('[OK] Form login terdeteksi');
  } catch {
    console.log('[WARN] Selector password tidak muncul, coba tunggu 5 detik lagi (CF challenge)');
    await page.screenshot({ path: 'screenshots/00_debug_login_page.png', fullPage: true });
    const html = await page.content().catch(() => '');
    console.log('[DEBUG] Page content length:', html.length, 'snippet:', html.slice(0,500));
    await page.waitForSelector('#username', { timeout: 15000 }).catch(() => console.log('[WARN] #username masih tidak ada'));
  }

  const userField = page.locator('#username, input[name="username"]').first();
  const passField = page.locator('#password, input[name="password"]').first();
  
  await userField.waitFor({ state: 'visible', timeout: 10000 });
  await userField.fill(username);
  await passField.fill(password);
  console.log('[INFO] Kredensial terisi');

  await page.locator('#login-button, button.login-button, button:has-text("Login")').first().click();
  
  // Tunggu redirect keluar dari /login
  await page.waitForFunction(() => !window.location.href.includes('/login'), null, { timeout: 20000 }).catch(async () => {
    await page.screenshot({ path: 'screenshots/00_login_failed.png', fullPage: true });
    throw new Error('Login gagal - masih di halaman login. Cek kredensial atau CAPTCHA.');
  });

  console.log(`[OK] Login Super Admin berhasil -> ${page.url()}`);
  await page.context().storageState({ path: 'config/storage-superadmin.json' });
  console.log('[OK] Session disimpan ke config/storage-superadmin.json (anti-block untuk crawl berikutnya)');
});
