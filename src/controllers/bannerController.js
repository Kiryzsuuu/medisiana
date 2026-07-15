const Banner = require('../models/Banner');

const MAX_BASE64_LENGTH = 3 * 1024 * 1024; // ~2.2MB original image after base64 inflation

function validateImage(imageBase64) {
  if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
    return 'imageBase64 harus berupa data URI gambar (data:image/...)';
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return 'Ukuran gambar terlalu besar (maks. ~2MB)';
  }
  return null;
}

async function listBanners(req, res, next) {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ banners });
  } catch (err) {
    next(err);
  }
}

// Public, unauthenticated - used by the pre-login page to fetch the
// admin-configured login photo (if any). Only ever returns 'login'
// placement banners, and only the fields the login page actually needs.
async function getPublicLoginBanner(req, res, next) {
  try {
    const banner = await Banner.findOne({ placement: 'login', isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('imageBase64 title');
    res.json({ banner: banner || null });
  } catch (err) {
    next(err);
  }
}

async function createBanner(req, res, next) {
  try {
    const { title, description, imageBase64, linkUrl, order, placement } = req.body;
    if (!title) return res.status(400).json({ error: 'title wajib diisi' });

    const imageError = validateImage(imageBase64);
    if (imageError) return res.status(400).json({ error: imageError });

    const banner = await Banner.create({
      title, description, imageBase64, linkUrl,
      order: order ?? 0,
      placement: placement === 'login' ? 'login' : 'dashboard',
      createdBy: req.user._id,
    });

    res.status(201).json({ banner });
  } catch (err) {
    next(err);
  }
}

async function updateBanner(req, res, next) {
  try {
    const { title, description, imageBase64, linkUrl, order, isActive, placement } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (linkUrl !== undefined) update.linkUrl = linkUrl;
    if (order !== undefined) update.order = order;
    if (isActive !== undefined) update.isActive = isActive;
    if (placement !== undefined) update.placement = placement === 'login' ? 'login' : 'dashboard';

    if (imageBase64 !== undefined) {
      const imageError = validateImage(imageBase64);
      if (imageError) return res.status(400).json({ error: imageError });
      update.imageBase64 = imageBase64;
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!banner) return res.status(404).json({ error: 'Banner tidak ditemukan' });
    res.json({ banner });
  } catch (err) {
    next(err);
  }
}

async function deleteBanner(req, res, next) {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner tidak ditemukan' });
    res.json({ message: 'Banner dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listBanners, getPublicLoginBanner, createBanner, updateBanner, deleteBanner };
