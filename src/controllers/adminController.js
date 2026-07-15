const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const RagMissLog = require('../models/RagMissLog');
const AiConfig = require('../models/AiConfig');
const EmailToken = require('../models/EmailToken');
const { sendMail } = require('../services/mailer/sender');
const { PROMPTS } = require('../services/ai/prompts');
const { DEFAULT_MODELS } = require('../services/ai/providers');
const { ENV_KEY_BY_PROVIDER } = require('../services/ai/config');

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    angkatan: user.angkatan,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

async function listUsers(req, res, next) {
  try {
    const { search, role, angkatan } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (angkatan) filter.angkatan = Number(angkatan);
    if (search) filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ users: users.map(publicUser) });
  } catch (err) {
    next(err);
  }
}

function genTempPassword() {
  return crypto.randomBytes(6).toString('hex');
}

async function createUser(req, res, next) {
  try {
    const { email, fullName, angkatan, role = 'student' } = req.body;
    if (!email || !fullName) return res.status(400).json({ error: 'email dan fullName wajib diisi' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email sudah terdaftar' });

    const tempPassword = genTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const user = await User.create({ email, fullName, angkatan, role, password: hashed, isVerified: true });

    await sendMail('welcome', user.email, { fullName, email: user.email, tempPassword });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { fullName, angkatan, role, avatarUrl } = req.body;
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (angkatan !== undefined) update.angkatan = angkatan;
    if (role !== undefined) update.role = role;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    user.isActive = req.body.isActive ?? !user.isActive;
    await user.save();
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({ message: 'User dihapus' });
  } catch (err) {
    next(err);
  }
}

async function importUsers(req, res, next) {
  try {
    const { users } = req.body; // [{ email, fullName, angkatan }]
    if (!Array.isArray(users)) return res.status(400).json({ error: 'users harus berupa array' });

    const results = [];
    for (const u of users) {
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (existing) {
        results.push({ email: u.email, status: 'skipped_exists' });
        continue;
      }
      const tempPassword = genTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 10);
      const user = await User.create({
        email: u.email, fullName: u.fullName, angkatan: u.angkatan,
        password: hashed, isVerified: true,
      });
      await sendMail('welcome', user.email, { fullName: user.fullName, email: user.email, tempPassword });
      results.push({ email: u.email, status: 'created' });
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const token = crypto.randomBytes(32).toString('hex');
    await EmailToken.create({
      userId: user._id, token, type: 'verify_email',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;
    await sendMail('verify-email', user.email, { fullName: user.fullName, verifyUrl });

    res.json({ message: 'Email verifikasi dikirim ulang' });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const [totalMessages, totalUsers, activeUsers, ragMissCount] = await Promise.all([
      ChatMessage.countDocuments({ role: 'assistant' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      RagMissLog.countDocuments(),
    ]);
    const totalSessions = await ChatSession.countDocuments();

    res.json({ totalMessages, totalUsers, activeUsers, totalSessions, ragMissCount });
  } catch (err) {
    next(err);
  }
}

async function analyticsTopics(req, res, next) {
  try {
    const topics = await ChatSession.aggregate([
      { $group: { _id: '$title', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.json({ topics });
  } catch (err) {
    next(err);
  }
}

async function analyticsRagMiss(req, res, next) {
  try {
    const misses = await RagMissLog.find().sort({ createdAt: -1 }).limit(100).populate('userId', 'fullName');
    res.json({ misses });
  } catch (err) {
    next(err);
  }
}

async function analyticsActiveStudents(req, res, next) {
  try {
    const leaderboard = await ChatSession.aggregate([
      { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
      { $sort: { sessionCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          sessionCount: 1,
          fullName: '$user.fullName',
          angkatan: '$user.angkatan',
        },
      },
    ]);
    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
}

const PROVIDERS = ['anthropic', 'openai', 'gemini', 'groq'];

/** Never send actual API key values to the client — only where each one resolves from. */
function apiKeyStatus(config) {
  const status = {};
  for (const p of PROVIDERS) {
    if (config.apiKeys?.[p]) status[p] = 'db';
    else if (process.env[ENV_KEY_BY_PROVIDER[p]]) status[p] = 'env';
    else status[p] = 'none';
  }
  return status;
}

async function getConfig(req, res, next) {
  try {
    let config = await AiConfig.findOne();
    if (!config) config = await AiConfig.create({});

    res.json({
      config: {
        topK: config.topK,
        maxTokens: config.maxTokens,
        promptOverrides: config.promptOverrides || {},
        aiProvider: config.aiProvider || 'anthropic',
        aiModel: config.aiModel || '',
      },
      apiKeyStatus: apiKeyStatus(config),
      promptDefaults: { CHAT: PROMPTS.CHAT, FALLBACK: PROMPTS.FALLBACK },
      providerDefaults: DEFAULT_MODELS,
    });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    let config = await AiConfig.findOne();
    if (!config) config = new AiConfig();

    const { topK, maxTokens, promptOverrides, aiProvider, aiModel, apiKeys } = req.body;

    if (topK !== undefined) config.topK = topK;
    if (maxTokens !== undefined) config.maxTokens = maxTokens;
    if (aiModel !== undefined) config.aiModel = aiModel;
    if (aiProvider !== undefined) {
      if (!PROVIDERS.includes(aiProvider)) return res.status(400).json({ error: `Provider tidak dikenal: ${aiProvider}` });
      config.aiProvider = aiProvider;
    }
    if (promptOverrides !== undefined) {
      config.promptOverrides = promptOverrides;
      config.markModified('promptOverrides');
    }
    // Blank/omitted key = "leave as-is" (so the admin doesn't have to
    // re-paste every key just to change an unrelated setting).
    if (apiKeys) {
      for (const p of PROVIDERS) {
        if (typeof apiKeys[p] === 'string' && apiKeys[p].trim()) {
          config.apiKeys[p] = apiKeys[p].trim();
        }
      }
    }

    config.updatedAt = new Date();
    await config.save();

    res.json({
      config: {
        topK: config.topK,
        maxTokens: config.maxTokens,
        promptOverrides: config.promptOverrides || {},
        aiProvider: config.aiProvider,
        aiModel: config.aiModel || '',
      },
      apiKeyStatus: apiKeyStatus(config),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers, createUser, updateUser, suspendUser, deleteUser, importUsers, resendVerification,
  analytics, analyticsTopics, analyticsRagMiss, analyticsActiveStudents, getConfig, updateConfig,
};
