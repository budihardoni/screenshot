# Eazy Academic - Screenshot Automation

Framework Playwright untuk mengambil **SEMUA SCREEN** secara otomatis, efektif & anti-block.
Dibuat untuk kebutuhan **Redesign UI/UX** - mencakup 7 kebutuhan Anda.

## Kenapa Harus Playwright Stealth (bukan fetch biasa)?

Situs `eazy-academic.btpdev.my.id` dilindungi **Cloudflare** (terdeteksi 403 saat curl).
Maka pendekatan harus:

1. Browser asli (Chromium headful/headless new)
2. Stealth plugin + real User-Agent + viewport + locale `id-ID`
3. Delay manusiawi, reuse session (storageState)
4. Handle Cloudflare challenge secara otomatis (tunggu redirect)

## Hasil yang Didapat (Sesuai Request Anda)

```
screenshots/
├── 01_login/
│   ├── login.png
│   ├── login_validation_error.png
│   └── forgot-password.png
├── 02_dashboard-admin/
│   ├── dashboard.png
│   ├── sidebar_collapsed.png
│   └── sidebar_expanded.png
├── 03_master-data/
│   ├── mahasiswa_list.png
│   ├── mahasiswa_detail.png
│   ├── mahasiswa_tambah.png
│   ├── mahasiswa_edit.png
│   ├── mahasiswa_filter_dropdown.png
│   ├── mahasiswa_modal_delete.png
│   └── mahasiswa_form_validation.png
├── 04_perkuliahan/
│   └── ...
└── report/
    ├── sitemap.md
    ├── flow-mermaid.md
    └── coverage.html
```

## Cara Pakai

1. Jangan kirim password di chat! Isi di `.env` atau GitHub Secrets
2. `npm install && npm run install-browsers`
3. `npx playwright test --project=admin` → otomatis crawl semua menu

Lihat `playwright.config.ts` dan `src/crawler.ts` untuk logika lengkap.
