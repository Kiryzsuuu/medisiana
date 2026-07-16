const { buildPrompt } = require('../services/ai/prompts');
const { searchRAGWithFallback, formatChunks, toSources } = require('../services/ai/rag');
const { callAI } = require('../services/ai/providers');
const { getAiConfig } = require('../services/ai/config');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const RagMissLog = require('../models/RagMissLog');

async function getChatHistory(sessionId, limit = 10) {
  if (!sessionId) return '(Sesi baru - belum ada riwayat)';
  const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: -1 }).limit(limit).lean();
  return messages
    .reverse()
    .map((m) => `${m.role === 'user' ? 'Mahasiswa' : 'Medina'}: ${m.content}`)
    .join('\n') || '(Sesi baru - belum ada riwayat)';
}

async function chat(req, res, next) {
  try {
    const { message, sessionId: bodySessionId, mode = 'chat', category = '' } = req.body;
    if (!message) return res.status(400).json({ error: 'message wajib diisi' });

    const userId = req.user._id;
    const angkatan = req.user.angkatan;

    let session = bodySessionId ? await ChatSession.findOne({ _id: bodySessionId, userId }) : null;
    if (!session) {
      session = await ChatSession.create({
        userId,
        mode,
        category,
        title: message.slice(0, 60),
      });
    }

    const config = await getAiConfig();
    const { chunks, score } = await searchRAGWithFallback(message, angkatan, {
      topK: config.topK,
      category: session.category,
      provider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.aiModel,
    });

    let promptType;
    if (score === 0 || chunks.length === 0) {
      promptType = 'FALLBACK';
    } else if (mode === 'quiz') {
      promptType = 'QUIZ';
    } else {
      promptType = 'CHAT';
    }

    const chatHistory = await getChatHistory(session._id);
    const systemPrompt = buildPrompt(promptType, {
      rag_context: formatChunks(chunks),
      chat_history: chatHistory,
      topic: message,
      quiz_history: chatHistory,
    }, config.promptOverrides);

    const response = await callAI(systemPrompt, message, {
      maxTokens: config.maxTokens,
      provider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.aiModel,
    });

    await ChatMessage.create({ sessionId: session._id, role: 'user', content: message });
    await ChatMessage.create({
      sessionId: session._id,
      role: 'assistant',
      content: response.text,
      sources: toSources(chunks),
    });
    session.updatedAt = new Date();
    await session.save();

    if (promptType === 'FALLBACK') {
      await RagMissLog.create({ question: message, userId });
    }

    res.json({ sessionId: session._id, message: response.text, sources: toSources(chunks) });
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });
    res.json({ session, messages });
  } catch (err) {
    next(err);
  }
}

async function updateSession(req, res, next) {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    await ChatMessage.deleteMany({ sessionId: session._id });
    res.json({ message: 'Sesi dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { chat, listSessions, getSession, updateSession, deleteSession, getChatHistory };
