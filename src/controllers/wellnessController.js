const WellnessLog = require('../models/WellnessLog');
const { buildPrompt } = require('../services/ai/prompts');
const { callAI } = require('../services/ai/providers');
const { getAiConfig } = require('../services/ai/config');

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server-local UTC day
}

async function logToday(req, res, next) {
  try {
    const { sleepHours, studyHours, stressLevel, mood, note } = req.body;
    const date = todayStr();

    const update = {};
    if (sleepHours !== undefined) update.sleepHours = sleepHours;
    if (studyHours !== undefined) update.studyHours = studyHours;
    if (stressLevel !== undefined) update.stressLevel = stressLevel;
    if (mood !== undefined) update.mood = mood;
    if (note !== undefined) update.note = note;

    const log = await WellnessLog.findOneAndUpdate(
      { userId: req.user._id, date },
      { $set: update, $setOnInsert: { userId: req.user._id, date } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ log });
  } catch (err) {
    next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const days = Math.min(Number(req.query.days) || 14, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const logs = await WellnessLog.find({
      userId: req.user._id,
      date: { $gte: sinceStr },
    }).sort({ date: 1 });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

async function askAi(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message wajib diisi' });

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const logs = await WellnessLog.find({
      userId: req.user._id,
      date: { $gte: since.toISOString().slice(0, 10) },
    }).sort({ date: 1 });

    const wellnessData = logs.length
      ? logs.map((l) => `- ${l.date}: tidur ${l.sleepHours ?? '-'} jam, belajar ${l.studyHours ?? '-'} jam, stres ${l.stressLevel ?? '-'}/5, mood ${l.mood || '-'}${l.note ? `, catatan: "${l.note}"` : ''}`).join('\n')
      : '(Belum ada data check-in 7 hari terakhir)';

    const config = await getAiConfig();
    const systemPrompt = buildPrompt('WELLNESS', {
      wellness_data: wellnessData,
      message,
    }, config.promptOverrides);

    const response = await callAI(systemPrompt, message, {
      maxTokens: Math.min(config.maxTokens, 500),
      provider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.aiModel,
    });

    res.json({ message: response.text });
  } catch (err) {
    next(err);
  }
}

module.exports = { logToday, listLogs, askAi };
