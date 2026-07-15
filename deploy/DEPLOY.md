# Deploy Medisiana ke VPS Biznet Gio Cloud (tanpa Docker)

Domain: **medisiana.ailabs.or.id** — pastikan A record domain ini sudah diarahkan ke IP publik VM sebelum mulai (cek dengan `ping medisiana.ailabs.or.id` dari komputer lokal).

Arsitektur: Node.js monolith (Express + Socket.io) dikelola PM2, di-reverse-proxy oleh nginx, SSL dari Let's Encrypt. Database MongoDB Atlas (cloud, sudah terpisah dari VM ini) — tidak perlu install MongoDB di VM.

---

## 1. Siapkan VM (sekali saja)

SSH ke VM Biznet Gio kamu, lalu:

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

node -v   # pastikan v20.x
npm -v

# PM2 — process manager, auto-restart kalau crash/reboot
sudo npm install -g pm2
```

## 2. Whitelist IP VM di MongoDB Atlas

Di dashboard MongoDB Atlas → Network Access → Add IP Address → masukkan **IP publik VM ini**. Tanpa ini, aplikasi tidak akan bisa konek ke database sama sekali dari server (beda dari localhost kamu yang mungkin sudah di-whitelist terpisah).

## 3. Clone project

```bash
cd /var/www   # atau lokasi lain sesuai preferensi
sudo git clone <URL_REPO_GIT_KAMU> medisiana
sudo chown -R $USER:$USER medisiana
cd medisiana
npm install --omit=dev
mkdir -p logs uploads
```

> Kalau project belum ada di Git remote, upload lewat `scp -r` dari komputer lokal ke VM sebagai alternatif clone.

## 4. Buat `.env` di server

```bash
nano .env
```

Isi persis seperti `.env` lokal kamu, **kecuali** dua baris ini yang perlu disesuaikan untuk production:

```env
NODE_ENV=production
CLIENT_URL=https://medisiana.ailabs.or.id
```

`PORT` tetap `5000` (nginx yang akan meneruskan trafik dari port 80/443 publik ke port 5000 internal — port 5000 sendiri **tidak** perlu dibuka ke publik).

Semua variabel lain (MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY, SMTP_*, dll) disalin apa adanya dari `.env` lokal.

## 5. Jalankan lewat PM2

```bash
pm2 start ecosystem.config.js
pm2 save                # simpan daftar proses supaya bangkit lagi setelah reboot
pm2 startup             # ikuti instruksi yang muncul (jalankan command sudo yang ditampilkan)
```

Cek statusnya:

```bash
pm2 status
pm2 logs medisiana       # lihat log real-time, Ctrl+C untuk keluar
```

Harus muncul log `[db] MongoDB connected` dan `[server] Medisiana berjalan di http://localhost:5000`.

## 6. Setup nginx (reverse proxy)

```bash
sudo cp deploy/nginx-medisiana.conf /etc/nginx/sites-available/medisiana
sudo ln -s /etc/nginx/sites-available/medisiana /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # opsional, matikan default nginx page
sudo nginx -t             # harus "syntax is ok" dan "test is successful"
sudo systemctl reload nginx
```

Buka firewall (kalau pakai `ufw`):

```bash
sudo ufw allow 'Nginx Full'   # buka port 80 + 443
sudo ufw allow OpenSSH
sudo ufw enable               # kalau belum aktif
```

Test tanpa SSL dulu: buka `http://medisiana.ailabs.or.id` di browser — halaman login Medisiana harus muncul.

## 7. Aktifkan HTTPS (Let's Encrypt, gratis)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d medisiana.ailabs.or.id
```

Certbot otomatis edit config nginx untuk redirect HTTP→HTTPS dan pasang sertifikat. Ikuti prompt (masukkan email, setuju ToS). Setelah selesai, `https://medisiana.ailabs.or.id` sudah aktif dengan SSL.

Sertifikat auto-renew via systemd timer bawaan certbot — cek dengan:

```bash
sudo certbot renew --dry-run
```

## 8. Buat akun admin pertama

```bash
cd /var/www/medisiana
npm run seed:admin -- admin@medisiana.id "Nama Admin" PasswordAman123
```

---

## Update / redeploy setelah ada perubahan kode

```bash
cd /var/www/medisiana
git pull
npm install --omit=dev
pm2 restart medisiana
```

## Troubleshooting cepat

| Gejala | Cek |
|---|---|
| `pm2 status` menunjukkan `errored` | `pm2 logs medisiana --lines 50` — biasanya `.env` salah atau MongoDB belum di-whitelist |
| Situs 502 Bad Gateway | Proses PM2 mati (`pm2 status`) atau nginx `proxy_pass` salah port |
| Study Room live chat tidak jalan tapi halaman lain OK | Header `Upgrade`/`Connection` di nginx config hilang — pastikan pakai `deploy/nginx-medisiana.conf` apa adanya |
| SSL gagal terbit | Pastikan DNS domain sudah propagate ke IP VM (`dig medisiana.ailabs.or.id`) sebelum jalankan certbot |
