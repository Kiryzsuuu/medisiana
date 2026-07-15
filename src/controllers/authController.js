const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailToken = require('../models/EmailToken');
const { sendMail } = require('../services/mailer/sender');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    angkatan: user.angkatan,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
  };
}

async function register(req, res, next) {
  try {
    const { email, password, fullName, angkatan } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password, dan fullName wajib diisi' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email sudah terdaftar' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, fullName, angkatan });

    const token = crypto.randomBytes(32).toString('hex');
    await EmailToken.create({
      userId: user._id,
      token,
      type: 'verify_email',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;
    await sendMail('verify-email', user.email, { fullName: user.fullName, verifyUrl });

    res.status(201).json({ message: 'Registrasi berhasil, cek email untuk verifikasi', user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Email atau password salah' });
    if (!user.isActive) return res.status(403).json({ error: 'Akun dinonaktifkan, hubungi admin' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Email atau password salah' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.json({ message: 'Logout berhasil (hapus token di client)' });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function verifyEmail(req, res, next) {
  try {
    const record = await EmailToken.findOne({ token: req.params.token, type: 'verify_email' });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token tidak valid atau kedaluwarsa' });
    }
    await User.findByIdAndUpdate(record.userId, { isVerified: true });
    await EmailToken.deleteOne({ _id: record._id });
    res.json({ message: 'Email berhasil diverifikasi' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.json({ message: 'Jika email terdaftar, link reset sudah dikirim' });

    const token = crypto.randomBytes(32).toString('hex');
    await EmailToken.create({
      userId: user._id,
      token,
      type: 'reset_password',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
    await sendMail('reset-password', user.email, { fullName: user.fullName, resetUrl });

    res.json({ message: 'Jika email terdaftar, link reset sudah dikirim' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;
    const record = await EmailToken.findOne({ token: req.params.token, type: 'reset_password' });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token tidak valid atau kedaluwarsa' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(record.userId, { password: hashed }, { new: true });
    await EmailToken.deleteOne({ _id: record._id });

    await sendMail('password-changed', user.email, { fullName: user.fullName });
    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, verifyEmail, forgotPassword, resetPassword };
