import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://eazy-academic.btpdev.my.id';

// MODE: Super Admin - 1 kredensial bisa akses semua role/modul
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.{spec,setup}.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // jangan parallel biar tidak kena rate-limit CF
  workers: 1,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'screenshots/report/results.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'off',
    screenshot: 'off', // kita handle manual fullPage
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    viewport: { width: 1440, height: 900 }, // Desktop Figma
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  },
  projects: [
    {
      name: 'super-admin',
      use: { 
        ...devices['Desktop Chrome'], 
        storageState: 'config/storage-superadmin.json',
        viewport: { width: 1440, height: 900 }
      },
    },
  ],
});
