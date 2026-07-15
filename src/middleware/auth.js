const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    // Query param fallback lets links opened in a new tab (e.g. viewing a PDF)
    // authenticate without a custom Authorization header.
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
    if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ error: 'Akun tidak valid' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }
}

module.exports = { auth };
