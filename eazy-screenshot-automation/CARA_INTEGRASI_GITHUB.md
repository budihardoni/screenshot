# Cara Integrasi GitHub - Tes Push/Commit (Wajib Baca)

Karena Anda sudah siapkan repo, ini 2 cara agar AI / automation bisa upload hasil screenshot ke repo Anda.

---

## OPSI 1: Paling Aman - GitHub Actions (Direkomendasikan)

**Anda tidak perlu share password ke AI sama sekali.** Semua jalan otomatis di server GitHub.

### Langkah 1: Upload Project Ini ke Repo Anda
1. Download folder `eazy-screenshot-automation` dari workspace ini (klik Download / copy)
2. Push ke repo Anda:
```bash
git clone https://github.com/USERNAME/REPO_ANDA.git
cd REPO_ANDA
cp -r ~/eazy-screenshot-automation ./
git add eazy-screenshot-automation
git commit -m "feat: add screenshot automation"
git push origin main
```

### Langkah 2: Set GitHub Secrets (agar tidak ter-block & aman)
Buka: `GitHub Repo > Settings > Secrets and variables > Actions > New repository secret`

Tambahkan 3 secret ini:
| Name | Value |
|------|-------|
| `BASE_URL` | `https://eazy-academic.btpdev.my.id` |
| `SUPERADMIN_USERNAME` | username super admin Anda |
| `SUPERADMIN_PASSWORD` | password super admin Anda |

> Kenapa aman? Password hanya disimpan encrypted di GitHub, tidak pernah terlihat di log. AI tidak pernah melihat plain text.

### Langkah 3: Jalankan
Buka `Actions > Eazy Screenshot Crawl > Run workflow`
- Hasil screenshot akan muncul di `Artifacts` (download ZIP)
- Dan otomatis ter-commit ke folder `eazy-screenshot-automation/screenshots/`

**Tes apakah bisa push?** Jalankan workflow sekali. Jika file screenshot muncul di repo, berarti berhasil.

---

## OPSI 2: AI Push Langsung via Personal Access Token (PAT)

Jika Anda ingin Arena AI yang langsung push (bukan via Actions):

### Buat PAT:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token > centang `repo` (full control)
3. Copy token (hanya muncul sekali, format `ghp_xxxx`)

### Berikan ke AI dengan aman:
Jangan paste di chat publik. Kirim via:
- `.env` lokal, atau
- Share repo URL dalam format: `https://ghp_xxxx@github.com/USERNAME/REPO.git`

AI akan jalankan:
```bash
git clone https://ghp_xxxx@github.com/USERNAME/REPO.git
# ... crawl & screenshot ...
git add screenshots/
git commit -m "update screenshots"
git push
```

### Tes koneksi (bisa Anda tes sendiri):
```bash
git ls-remote https://ghp_xxxx@github.com/USERNAME/REPO.git
# Jika sukses, akan list branch tanpa error
```

---

## OPSI 3: Manual (Jika GH Actions diblokir Cloudflare)

Kadang GitHub Actions IP ter-block Cloudflare. Solusi:
- Jalankan lokal: `npm install && npx playwright test --project=super-admin`
- Hasil di `screenshots/` tinggal `git push` manual dari laptop Anda.

---

## Apa yang Perlu Anda Kirim ke Saya Sekarang?

1. **URL Repo** Anda, contoh: `https://github.com/btpdev/eazy-redesign-screenshots`
2. **Saya akan** test `git ls-remote` apakah repo bisa diakses
3. Jika OK, saya akan siapkan instruksi final push

Jangan kirim username/password Eazy di chat. Cukup set di GitHub Secrets (Opsi 1).
