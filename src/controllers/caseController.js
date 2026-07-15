const CaseDiscussion = require('../models/CaseDiscussion');
const { buildPrompt } = require('../services/ai/prompts');
const { searchRAG, formatChunks, toSources } = require('../services/ai/rag');
const { callAI } = require('../services/ai/providers');
const { getAiConfig } = require('../services/ai/config');

async function listCases(req, res, next) {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const cases = await CaseDiscussion.find(filter).sort({ createdAt: -1 });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
}

async function createCase(req, res, next) {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title dan content wajib diisi' });

    const caseDoc = await CaseDiscussion.create({ title, content, category, postedBy: req.user._id });
    res.status(201).json({ case: caseDoc });
  } catch (err) {
    next(err);
  }
}

async function getCase(req, res, next) {
  try {
    const caseDoc = await CaseDiscussion.findById(req.params.id)
      .populate('postedBy', 'fullName')
      .populate('comments.userId', 'fullName');
    if (!caseDoc) return res.status(404).json({ error: 'Kasus tidak ditemukan' });
    res.json({ case: caseDoc });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content wajib diisi' });

    const caseDoc = await CaseDiscussion.findById(req.params.id);
    if (!caseDoc) return res.status(404).json({ error: 'Kasus tidak ditemukan' });

    caseDoc.comments.push({ userId: req.user._id, content });
    await caseDoc.save();

    res.status(201).json({ case: caseDoc });
  } catch (err) {
    next(err);
  }
}

async function askAi(req, res, next) {
  try {
    const caseDoc = await CaseDiscussion.findById(req.params.id);
    if (!caseDoc) return res.status(404).json({ error: 'Kasus tidak ditemukan' });

    const config = await getAiConfig();
    const { chunks } = await searchRAG(caseDoc.content, req.user.angkatan, { topK: config.topK });
    const comments = caseDoc.comments.map((c) => `- ${c.content}`).join('\n') || '(Belum ada komentar)';

    const systemPrompt = buildPrompt('CASE', {
      case_content: caseDoc.content,
      comments,
      rag_context: formatChunks(chunks),
    }, config.promptOverrides);

    const response = await callAI(systemPrompt, 'Tolong berikan hint Socratic untuk kasus ini.', {
      maxTokens: Math.min(config.maxTokens, 500),
      provider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.aiModel,
    });

    caseDoc.comments.push({
      userId: req.user._id,
      content: response.text,
      isAi: true,
      sources: toSources(chunks),
    });
    await caseDoc.save();

    res.json({ message: response.text, sources: toSources(chunks) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCases, createCase, getCase, addComment, askAi };
