function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak - khusus admin' });
  }
  next();
}

module.exports = { adminOnly };
