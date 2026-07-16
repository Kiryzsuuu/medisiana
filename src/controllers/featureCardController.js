const FeatureCard = require('../models/FeatureCard');

const MAX_BASE64_LENGTH = 3 * 1024 * 1024;

const DEFAULT_CARDS = [
  { title: 'Medina AI', description: 'Tutor AI Socratis yang mendorongmu berpikir sebelum memberi jawaban dari buku terverifikasi.', linkUrl: 'chat.html', linkLabel: 'Mulai chat', icon: 'ti-robot', color: 'blue', order: 0 },
  { title: 'Latihan Soal', description: 'Uji pemahamanmu dengan soal-soal klinis berbasis materi yang sudah kamu pelajari.', linkUrl: 'quiz.html', linkLabel: 'Mulai latihan', icon: 'ti-pencil', color: 'amber', order: 1 },
  { title: 'Study Room', description: 'Belajar bareng teman satu angkatan secara real-time dalam ruang diskusi kolaboratif.', linkUrl: 'rooms.html', linkLabel: 'Lihat room', icon: 'ti-users-group', color: 'green', order: 2 },
  { title: 'Diskusi Kasus', description: 'Posting dan diskusikan kasus klinis menarik bersama sesama mahasiswa FK.', linkUrl: 'cases.html', linkLabel: 'Lihat kasus', icon: 'ti-stethoscope', color: 'purple', order: 3 },
  { title: 'Kesehatan Diri', description: 'Pantau kondisi fisik dan mentalmu agar tetap prima selama masa studi kedokteran.', linkUrl: 'wellness.html', linkLabel: 'Cek kondisi', icon: 'ti-heartbeat', color: 'red', order: 4 },
  { title: 'Dashboard', description: 'Lihat statistik belajarmu, aktivitas terakhir, dan buku referensi yang tersedia.', linkUrl: 'dashboard.html', linkLabel: 'Lihat statistik', icon: 'ti-layout-grid', color: 'gray', order: 5 },
];

function validateImage(imageBase64) {
  if (!imageBase64) return null;
  if (!imageBase64.startsWith('data:image/')) return 'imageBase64 harus berupa data URI gambar (data:image/...)';
  if (imageBase64.length > MAX_BASE64_LENGTH) return 'Ukuran gambar terlalu besar (maks. ~2MB)';
  return null;
}

// Seeds the original 6 feature cards on first ever use, so the home page
// keeps looking sensible before an admin has touched this feature at all.
async function ensureSeeded() {
  const count = await FeatureCard.countDocuments();
  if (count === 0) await FeatureCard.insertMany(DEFAULT_CARDS);
}

async function listFeatureCards(req, res, next) {
  try {
    await ensureSeeded();
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const cards = await FeatureCard.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ cards });
  } catch (err) {
    next(err);
  }
}

async function createFeatureCard(req, res, next) {
  try {
    const { title, description, linkUrl, linkLabel, icon, color, imageBase64, order } = req.body;
    if (!title || !linkUrl) return res.status(400).json({ error: 'title dan linkUrl wajib diisi' });

    const imageError = validateImage(imageBase64);
    if (imageError) return res.status(400).json({ error: imageError });

    const card = await FeatureCard.create({
      title, description, linkUrl,
      linkLabel: linkLabel || 'Buka',
      icon: icon || 'ti-bolt',
      color: color || 'blue',
      imageBase64: imageBase64 || '',
      order: order ?? 0,
      createdBy: req.user._id,
    });

    res.status(201).json({ card });
  } catch (err) {
    next(err);
  }
}

async function updateFeatureCard(req, res, next) {
  try {
    const { title, description, linkUrl, linkLabel, icon, color, imageBase64, order, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (linkUrl !== undefined) update.linkUrl = linkUrl;
    if (linkLabel !== undefined) update.linkLabel = linkLabel;
    if (icon !== undefined) update.icon = icon;
    if (color !== undefined) update.color = color;
    if (order !== undefined) update.order = order;
    if (isActive !== undefined) update.isActive = isActive;

    if (imageBase64 !== undefined) {
      const imageError = validateImage(imageBase64);
      if (imageError) return res.status(400).json({ error: imageError });
      update.imageBase64 = imageBase64;
    }

    const card = await FeatureCard.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!card) return res.status(404).json({ error: 'Kartu tidak ditemukan' });
    res.json({ card });
  } catch (err) {
    next(err);
  }
}

async function deleteFeatureCard(req, res, next) {
  try {
    const card = await FeatureCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Kartu tidak ditemukan' });
    res.json({ message: 'Kartu dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFeatureCards, createFeatureCard, updateFeatureCard, deleteFeatureCard };
