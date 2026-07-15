# Medisiana — Product Requirements Document (PRD)

> Platform Edukasi AI berbasis RAG + Socratic untuk Mahasiswa Fakultas Kedokteran S1 Indonesia  
> Powered by Anthropic Claude API · Node.js Monolith · MongoDB · Online-first

**Versi:** 1.0  
**Status:** In Development  
**Terakhir diupdate:** Juli 2025

---

## DAFTAR ISI

1. [Overview](#1-overview)
2. [Target User & Role](#2-target-user--role)
3. [Tech Stack](#3-tech-stack)
4. [Arsitektur Sistem](#4-arsitektur-sistem)
5. [Struktur Folder](#5-struktur-folder)
6. [Fitur & Fungsi](#6-fitur--fungsi)
7. [RAG Pipeline](#7-rag-pipeline)
8. [AI Tutor — Medina](#8-ai-tutor--medina)
9. [Fitur Kolaborasi](#9-fitur-kolaborasi)
10. [Role & Permission](#10-role--permission)
11. [Database Schema (MongoDB)](#11-database-schema-mongodb)
12. [API Endpoint](#12-api-endpoint)
13. [Email & Notifikasi (SMTP)](#13-email--notifikasi-smtp)
14. [UI — Halaman & File](#14-ui--halaman--file)
15. [Environment Variables](#15-environment-variables)
16. [Out of Scope v1](#16-out-of-scope-v1)

---

## 1. Overview

**Medisiana** adalah platform edukasi berbasis AI untuk mahasiswa Fakultas Kedokteran S1 — konsep yang sama dengan EduNusa (untuk SD/SMP/SMA), namun ditujukan untuk jenjang FK dengan konten dan fitur yang lebih kompleks.

Tiga pilar utama:
- **Medina AI** — AI tutor berbasis RAG dengan pendekatan Socratic. Hanya menjawab dari buku yang diunggah admin.
- **Kolaborasi** — Study Room live, diskusi kasus klinis, tanya Medina bareng (group AI session).
- **Admin Control** — Admin mengelola seluruh knowledge base RAG, user, dan konfigurasi AI.

---

## 2. Target User & Role

| Role | Deskripsi |
|---|---|
| **Mahasiswa FK S1** | Pre-klinik tahun 1–4, pengguna utama platform |
| **Admin** | Mengelola buku RAG, user, dan konfigurasi Medina AI |

> v2 (masa depan): Dosen/Tutor sebagai fasilitator diskusi kasus

---

## 3. Tech Stack

### Arsitektur: Node.js Monolith

Satu repository, satu server Express — serving REST API + frontend sekaligus.

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Runtime** | Node.js 20 LTS | — |
| **Framework** | Express.js | REST API + serve static frontend |
| **Frontend** | HTML + CSS + Vanilla JS | Di-serve langsung oleh Express |
| **Database** | MongoDB + Mongoose | Semua data: user, buku, chat, room, kasus |
| **Vector Search** | MongoDB Atlas Vector Search | RAG embedding & similarity search |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Stateless, kontrol penuh |
| **File Storage** | Multer + Local/S3/Cloudinary | Upload PDF buku |
| **AI Model** | Anthropic Claude API `claude-sonnet-4-6` | Medina AI |
| **Embedding** | Voyage AI / OpenAI text-embedding-3-small | Embed chunks untuk RAG |
| **PDF Parser** | pdf-parse | Extract teks dari buku PDF |
| **Realtime** | Socket.io | Live chat Study Room |
| **Email/SMTP** | Nodemailer + SMTP | Verifikasi, reset password, notifikasi |
| **Email Template** | Handlebars (.hbs) | Template HTML email |
| **Job Queue** | Bull + Redis | Background job: indexing PDF, kirim email |
| **Deployment** | Railway / Render / VPS | Single service, monolith |

---

## 4. Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────┐
│              BROWSER — HTML + CSS + Vanilla JS                  │
│  [Login]  [Dashboard]  [Chat]  [Rooms]  [Cases]  [Admin]        │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTPS + WebSocket (Socket.io)
┌──────────────────────────▼─────────────────────────────────────┐
│                NODE.JS MONOLITH — Express.js                    │
│                                                                 │
│  [REST API Routes]     [Socket.io Server]    [Bull Queue]       │
│  /api/auth             room:message          index-pdf          │
│  /api/chat             room:ask-ai           send-email         │
│  /api/books            room:join/leave                          │
│  /api/rooms                                                     │
│  /api/cases                                                     │
│  /api/admin                                                     │
│  /static → serve HTML/CSS/JS                                    │
└──────┬──────────────┬──────────────────┬────────────────────────┘
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐  ┌───────▼────────┐
│  Anthropic  │ │  MongoDB   │  │  Nodemailer    │
│  Claude API │ │  Atlas     │  │  + SMTP        │
│  (Medina)   │ │  + Vector  │  │                │
│             │ │  Search    │  │                │
└─────────────┘ └─────┬──────┘  └────────────────┘
                      │
              ┌───────▼──────────────┐  ┌──────────────┐
              │  File Storage        │  │  Redis       │
              │  (PDF upload)        │  │  (Bull Queue)│
              └──────────────────────┘  └──────────────┘
```

### Alur: Mahasiswa Tanya Medina AI

```
User kirim pesan
       │
       ▼
[Embed pertanyaan → Voyage AI / OpenAI]
       │
       ▼
[MongoDB Atlas Vector Search]
       │ → top_k = 5 chunks, similarity ≥ 0.75
       ▼
[Build system prompt]
       │ → Inject RAG chunks + chat history + system prompt
       ▼
[Claude API: claude-sonnet-4-6]
       │
       ▼
[Response Socratic — tanya balik dulu]
       │
       ▼
[Simpan ke DB: ChatMessage + sources]
       │
       ▼
[Return ke client]
```

---

## 5. Struktur Folder

```
medisiana/
├── src/
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   ├── redis.js         # Redis connection (Bull)
│   │   └── mailer.js        # Nodemailer setup
│   │
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Book.js
│   │   ├── DocumentChunk.js
│   │   ├── ChatSession.js
│   │   ├── ChatMessage.js
│   │   ├── StudyRoom.js
│   │   ├── RoomMessage.js
│   │   ├── CaseDiscussion.js
│   │   ├── Bookmark.js
│   │   └── EmailToken.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── books.js
│   │   ├── rooms.js
│   │   ├── cases.js
│   │   └── admin.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── bookController.js
│   │   ├── roomController.js
│   │   ├── caseController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   │   ├── auth.js          # JWT verify middleware
│   │   ├── adminOnly.js     # Role guard
│   │   ├── upload.js        # Multer PDF upload
│   │   └── errorHandler.js
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── claude.js        # Anthropic API call
│   │   │   ├── rag.js           # RAG retrieval pipeline
│   │   │   ├── embedding.js     # Embed text → vector
│   │   │   └── prompts.js       # Semua system prompt
│   │   ├── pdf/
│   │   │   ├── parser.js        # Extract teks dari PDF
│   │   │   └── chunker.js       # Split teks → chunks
│   │   └── mailer/
│   │       ├── sender.js        # Kirim email via Nodemailer
│   │       └── templates/
│   │           ├── verify-email.hbs
│   │           ├── reset-password.hbs
│   │           ├── welcome.hbs
│   │           └── room-invite.hbs
│   │
│   ├── queues/
│   │   ├── indexQueue.js    # Bull queue: PDF indexing job
│   │   └── emailQueue.js    # Bull queue: email job
│   │
│   └── socket/
│       └── roomSocket.js    # Socket.io handlers (study room)
│
├── public/                  # Frontend static files
│   ├── index.html           # Login
│   ├── dashboard.html
│   ├── chat.html
│   ├── rooms.html
│   ├── cases.html
│   ├── admin-books.html
│   ├── admin-users.html
│   ├── admin-ai.html
│   ├── admin-analytics.html
│   ├── styles.css
│   └── main.js
│
├── uploads/                 # Temporary PDF storage
├── .env
├── .env.example
├── package.json
└── server.js                # Entry point
```

---

## 6. Fitur & Fungsi

### 6.1 Mahasiswa

#### Medina AI (Chat)
- Chat 1-on-1 dengan Medina — RAG dari buku admin, pendekatan Socratic
- Mode latihan soal — AI generate soal dari materi, koreksi jawaban
- Riwayat sesi tersimpan — bisa kembali ke sesi lama
- Filter topik per sistem organ (Kardio, Neuro, Respirasi, dll)
- Source citation — setiap jawaban cantumkan buku + bab + halaman
- Typing indicator saat Medina memproses

#### Study Room
- Lihat dan join room public
- Buat room private (dengan kode invite)
- Live chat realtime (Socket.io) antar mahasiswa
- Mention `@Medina` di chat room → AI jawab dalam konteks grup (semua anggota lihat)
- Room tersimpan — bisa kembali kapan saja

#### Diskusi Kasus Klinis
- Lihat daftar kasus yang dipost admin atau mahasiswa lain
- Post kasus baru (identitas pasien fiksi, keluhan, PF, lab)
- Komentar differential diagnosis
- Minta hint Medina (Socratic — tidak beri diagnosis langsung)
- Filter kasus per sistem organ

#### Akun & Progress
- Profil mahasiswa (nama, angkatan, avatar)
- Progress tracker per buku
- Bookmark materi dari buku

---

### 6.2 Admin

#### Manajemen Buku & RAG
- Upload PDF buku kedokteran
- Auto-indexing (queue background): parse → chunk → embed → simpan ke MongoDB Atlas
- Lihat status indexing per buku (pending / processing / done / error)
- Aktifkan/nonaktifkan buku per angkatan
- Re-index buku jika ada update
- Hapus buku + semua chunks-nya

#### Manajemen User
- Tambah mahasiswa (email + angkatan) → sistem kirim email verifikasi
- Bulk import via CSV
- Lihat aktivitas per mahasiswa (sesi AI, login terakhir)
- Reset password, suspend/aktifkan akun
- Kirim ulang email verifikasi

#### Konfigurasi Medina AI
- Edit system prompt langsung dari UI
- Atur top_k chunks, similarity threshold, max_tokens
- Pilih buku aktif per angkatan
- Lihat riwayat versi prompt

#### Analytics
- Total pesan ke AI, user aktif, token terpakai
- RAG hit rate vs fallback rate
- Topik paling sering ditanyakan
- Pertanyaan yang tidak terjawab (RAG miss) → rekomendasi buku yang perlu diupload
- Mahasiswa paling aktif

---

## 7. RAG Pipeline

### Proses Ingest (Admin Upload Buku)

```
Admin upload PDF
       │
       ▼
[Multer — simpan ke /uploads sementara]
       │
       ▼
[Bull Queue: index-pdf job]
       │
       ▼
[pdf-parse — extract teks per halaman]
       │
       ▼
[Chunker — split ~500 token, overlap 50 token]
       │   pertahankan batas paragraf, jangan potong kalimat
       ▼
[Metadata tagging per chunk]
       │   { bookId, bookTitle, chapter, pageNumber, category }
       ▼
[Embedding — Voyage AI / OpenAI]
       │   dimensi: 1536
       ▼
[Simpan ke MongoDB: collection document_chunks]
       │   dengan field embedding (vector)
       ▼
[Update status buku → 'done']
       │
       ▼
[Kirim notifikasi email ke admin]
```

### Proses Retrieval (Saat Chat)

```
User input pertanyaan
       │
       ▼
[Embed pertanyaan]
       │
       ▼
[MongoDB Atlas Vector Search]
       │   filter: bookId IN [buku aktif untuk angkatan ini]
       │   similarity: cosine, top_k: 5, threshold: ≥ 0.75
       ▼
Jika hasil ditemukan:
   [Build context dari chunks]
   [Inject ke PROMPT-01 (Chat) atau PROMPT-02 (Quiz)]
   [Call Claude API]
   [Simpan response + sources]

Jika tidak ditemukan (score < 0.75):
   [Gunakan PROMPT-06 (Fallback)]
   [Log sebagai RAG miss untuk analytics]
```

---

## 8. AI Tutor — Medina

- **Nama AI:** Medina
- **Model:** `claude-sonnet-4-6`
- **Pendekatan:** Socratic — tanya balik sebelum memberi jawaban
- **Batasan:** Hanya menjawab dari RAG context. Jika tidak ada → fallback message
- **Sumber selalu dicantumkan:** `📖 [Judul Buku], Bab X, hal. Y`

### Pendekatan Socratic (3 Tahap)

**Tahap 1 — Eksplorasi:**
Jangan langsung jawab. Tanya balik untuk ukur pemahaman awal mahasiswa.

**Tahap 2 — Evaluasi:**
- Jika benar → apresiasi spesifik + perkuat dari buku
- Jika salah → koreksi suportif + hint dari buku + tanya lagi
- Jika tidak tahu → scaffolding bertahap + analogi sederhana

**Tahap 3 — Pendalaman:**
Penjelasan lengkap dari buku + sumber + pertanyaan lanjutan

---

## 9. Fitur Kolaborasi

### Study Room

| Tipe | Deskripsi |
|---|---|
| Public | Semua mahasiswa bisa join langsung |
| Private | Butuh kode invite, dibuat oleh mahasiswa |

Fitur dalam room:
- Live chat realtime (Socket.io)
- `@Medina` mention → AI respond ke seluruh room (group AI session)
- Medina tetap Socratic bahkan di group session

### Diskusi Kasus Klinis

- Kasus berisi: identitas pasien fiksi, keluhan, PF, lab awal
- Mahasiswa komentar DD mereka
- Medina diberi hint mode — tidak langsung sebut diagnosis, dorong berpikir
- Source citation tetap aktif

---

## 10. Role & Permission

| Aksi | Mahasiswa | Admin |
|---|---|---|
| Chat Medina AI | ✅ | ✅ |
| Lihat materi / buku | ✅ | ✅ |
| Bookmark materi | ✅ | ❌ |
| Join Study Room | ✅ | ❌ |
| Buat Study Room | ✅ | ❌ |
| Post diskusi kasus | ✅ | ✅ |
| Upload buku PDF | ❌ | ✅ |
| Hapus / nonaktifkan buku | ❌ | ✅ |
| Kelola user | ❌ | ✅ |
| Lihat analytics | ❌ | ✅ |
| Edit system prompt AI | ❌ | ✅ |
| Konfigurasi RAG | ❌ | ✅ |

---

## 11. Database Schema (MongoDB)

```javascript
// ── USER ──
const userSchema = new mongoose.Schema({
  email:       { type: String, unique: true, required: true },
  password:    { type: String, required: true },          // bcrypt
  fullName:    { type: String, required: true },
  role:        { type: String, enum: ['student', 'admin'], default: 'student' },
  angkatan:    { type: Number },
  avatarUrl:   { type: String },
  isActive:    { type: Boolean, default: true },
  isVerified:  { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

// ── BOOK ──
const bookSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  author:      { type: String },
  category:    { type: String },           // Interna, Fisiologi, Patologi, dll
  edition:     { type: String },
  fileUrl:     { type: String },           // path ke PDF
  isActive:    { type: Boolean, default: true },
  activeFor:   [{ type: Number }],         // angkatan yang punya akses, kosong = semua
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  indexStatus: { type: String, enum: ['pending','processing','done','error'], default: 'pending' },
  totalChunks: { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

// ── DOCUMENT CHUNK (RAG) ──
const documentChunkSchema = new mongoose.Schema({
  bookId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  content:     { type: String, required: true },
  pageNumber:  { type: Number },
  chapter:     { type: String },
  embedding:   { type: [Number] },         // 1536 dimensi — Atlas Vector Search
  metadata:    { type: mongoose.Schema.Types.Mixed },
  createdAt:   { type: Date, default: Date.now }
});

// ── CHAT SESSION ──
const chatSessionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, default: 'Sesi Baru' },
  mode:        { type: String, enum: ['chat', 'quiz'], default: 'chat' },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

// ── CHAT MESSAGE ──
const chatMessageSchema = new mongoose.Schema({
  sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  role:        { type: String, enum: ['user', 'assistant'], required: true },
  content:     { type: String, required: true },
  sources:     [{ bookTitle: String, chapter: String, page: Number }],
  createdAt:   { type: Date, default: Date.now }
});

// ── STUDY ROOM ──
const studyRoomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  type:        { type: String, enum: ['public', 'private'], default: 'public' },
  topic:       { type: String },
  inviteCode:  { type: String },           // hanya untuk private room
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:   { type: Date, default: Date.now }
});

// ── ROOM MESSAGE ──
const roomMessageSchema = new mongoose.Schema({
  roomId:      { type: mongoose.Schema.Types.ObjectId, ref: 'StudyRoom', required: true },
  senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderType:  { type: String, enum: ['user', 'ai'], required: true },
  content:     { type: String, required: true },
  sources:     [{ bookTitle: String, chapter: String, page: Number }],
  createdAt:   { type: Date, default: Date.now }
});

// ── CASE DISCUSSION ──
const caseDiscussionSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  content:     { type: String, required: true },   // deskripsi kasus
  category:    { type: String },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content:   { type: String },
    isAi:      { type: Boolean, default: false },
    sources:   [{ bookTitle: String, chapter: String, page: Number }],
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt:   { type: Date, default: Date.now }
});

// ── BOOKMARK ──
const bookmarkSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  pageNumber:  { type: Number },
  note:        { type: String },
  createdAt:   { type: Date, default: Date.now }
});

// ── EMAIL TOKEN ──
const emailTokenSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:       { type: String, required: true },
  type:        { type: String, enum: ['verify_email', 'reset_password'] },
  expiresAt:   { type: Date, required: true },
  createdAt:   { type: Date, default: Date.now }
});
```

---

## 12. API Endpoint

### Auth
```
POST   /api/auth/register              → Daftar + kirim email verifikasi
POST   /api/auth/login                 → Login → dapat JWT
POST   /api/auth/logout                → Invalidate token (client-side)
GET    /api/auth/me                    → Data user yang sedang login
GET    /api/auth/verify-email/:token   → Verifikasi email dari link
POST   /api/auth/forgot-password       → Kirim email reset password
POST   /api/auth/reset-password/:token → Set password baru
```

### Medina AI Chat
```
POST   /api/chat                       → Kirim pesan (RAG + Socratic)
                                         body: { sessionId?, message, mode? }
GET    /api/chat/sessions              → List semua sesi chat user
GET    /api/chat/sessions/:id          → Detail sesi + semua messages
PATCH  /api/chat/sessions/:id          → Update judul sesi
DELETE /api/chat/sessions/:id          → Hapus sesi
```

### Buku (Admin only)
```
GET    /api/books                      → List semua buku (+ filter kategori, status)
POST   /api/books                      → Upload buku baru (multipart/form-data PDF)
GET    /api/books/:id                  → Detail buku + status indexing
PATCH  /api/books/:id                  → Update metadata (judul, kategori, isActive)
DELETE /api/books/:id                  → Hapus buku + semua chunks
POST   /api/books/:id/reindex          → Re-index ulang (hapus chunks lama, index ulang)
GET    /api/books/:id/chunks           → Preview chunks dari buku (debug)
```

### Study Room
```
GET    /api/rooms                      → List public rooms + rooms yang diikuti
POST   /api/rooms                      → Buat room baru
GET    /api/rooms/:id                  → Detail room + 50 pesan terakhir
POST   /api/rooms/:id/join             → Join room (public / dengan invite code)
DELETE /api/rooms/:id/leave            → Leave room
GET    /api/rooms/:id/messages         → Load pesan lebih lama (pagination)
POST   /api/rooms/:id/ask-ai           → Tanya Medina dalam konteks group room
```

### Diskusi Kasus
```
GET    /api/cases                      → List semua kasus (+ filter kategori)
POST   /api/cases                      → Post kasus baru
GET    /api/cases/:id                  → Detail kasus + semua komentar
POST   /api/cases/:id/comments         → Tambah komentar
POST   /api/cases/:id/ask-ai           → Minta hint Socratic dari Medina
```

### Admin
```
GET    /api/admin/users                → List semua user (+ filter, search)
POST   /api/admin/users                → Buat user baru → kirim welcome email
PUT    /api/admin/users/:id            → Update data user
PATCH  /api/admin/users/:id/suspend    → Suspend/aktifkan akun
DELETE /api/admin/users/:id            → Hapus user
POST   /api/admin/users/import         → Bulk import via CSV
POST   /api/admin/users/:id/resend-verification → Kirim ulang email verifikasi
GET    /api/admin/analytics            → Dashboard stats
GET    /api/admin/analytics/topics     → Topik paling ditanyakan
GET    /api/admin/analytics/rag-miss   → Pertanyaan tanpa jawaban
GET    /api/admin/config               → Get konfigurasi AI
PUT    /api/admin/config               → Update konfigurasi AI (prompt, top_k, dll)
```

---

## 13. Email & Notifikasi (SMTP)

### Konfigurasi

```javascript
// src/config/mailer.js
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});
```

### Jenis Email

| Trigger | Template | Isi |
|---|---|---|
| Register mahasiswa | `verify-email.hbs` | Link verifikasi email (expire 24 jam) |
| Lupa password | `reset-password.hbs` | Link reset password (expire 1 jam) |
| Password berhasil diubah | `password-changed.hbs` | Konfirmasi keamanan |
| Admin buat akun mahasiswa | `welcome.hbs` | Selamat datang + temporary password |
| Diundang ke room private | `room-invite.hbs` | Nama room + kode invite |
| Buku selesai diindex | `index-done.hbs` | Notifikasi ke admin (via Bull queue) |

### Template Structure (Handlebars)

```
src/services/mailer/templates/
├── verify-email.hbs        → Subject: "Verifikasi email Medisiana kamu"
├── reset-password.hbs      → Subject: "Reset password Medisiana"
├── password-changed.hbs    → Subject: "Password kamu berhasil diubah"
├── welcome.hbs             → Subject: "Selamat datang di Medisiana!"
├── room-invite.hbs         → Subject: "Kamu diundang ke Study Room"
└── index-done.hbs          → Subject: "[Admin] Buku selesai diindex"
```

---

## 14. UI — Halaman & File

Semua file HTML di-serve dari folder `/public` oleh Express.

| File | Halaman | User |
|---|---|---|
| `index.html` | Login | Semua |
| `dashboard.html` | Dashboard utama | Mahasiswa |
| `chat.html` | Medina AI chat | Mahasiswa |
| `rooms.html` | Study Room | Mahasiswa |
| `cases.html` | Diskusi Kasus | Mahasiswa |
| `admin-books.html` | Kelola Buku & RAG | Admin |
| `admin-users.html` | Kelola User | Admin |
| `admin-ai.html` | Konfigurasi Medina AI | Admin |
| `admin-analytics.html` | Analytics | Admin |
| `styles.css` | Shared stylesheet | — |
| `main.js` | Shared navigation helpers | — |

### UI Theme
- **Background:** `#F0F5FB` (biru muda sangat terang)
- **White surface:** `#FFFFFF`
- **Primary blue:** `#1A6FD4`
- **Navy text:** `#0F2B4A`
- **Accent green:** `#00B38A`
- **Mode:** Light only (v1)

---

## 15. Environment Variables

```env
# ── App ──
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5000

# ── Auth ──
JWT_SECRET=ganti_dengan_string_random_panjang
JWT_EXPIRES_IN=7d

# ── MongoDB ──
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/medisiana

# ── Anthropic ──
ANTHROPIC_API_KEY=sk-ant-...

# ── Embedding ──
VOYAGE_API_KEY=              # Pilih salah satu
OPENAI_API_KEY=              # Pilih salah satu

# ── File Storage ──
UPLOAD_DIR=./uploads         # Local storage (dev)
# AWS_S3_BUCKET=             # S3 (production)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# CLOUDINARY_URL=            # Cloudinary (alternatif)

# ── SMTP / Mailer ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@medisiana.id
SMTP_PASS=
MAIL_FROM="Medisiana <noreply@medisiana.id>"

# ── Redis (Bull Queue) ──
REDIS_URL=redis://localhost:6379
```

---

## 16. Out of Scope v1

Fitur ini **tidak** masuk v1:

- ❌ Dosen/tutor sebagai role
- ❌ Video/audio materi
- ❌ Mobile app native (iOS/Android)
- ❌ Ujian/assessment formal dengan nilai
- ❌ Integrasi LMS kampus (Moodle, dll)
- ❌ Fine-tuning model sendiri
- ❌ Offline mode
- ❌ Notifikasi push
- ❌ Dark mode UI
- ❌ OAuth login (Google, dll)

---

*Medisiana PRD v1.0 — Living document, update sesuai perkembangan development.*
