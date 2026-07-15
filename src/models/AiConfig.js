const mongoose = require('mongoose');

const aiConfigSchema = new mongoose.Schema({
  topK:                { type: Number, default: 5 },
  similarityThreshold:  { type: Number, default: 0.75 }, // legacy — unused since RAG moved to keyword search
  maxTokens:            { type: Number, default: 1000 },
  promptOverrides:      { type: mongoose.Schema.Types.Mixed, default: {} },

  // Which AI provider Medina uses, and the model name for it (blank = provider default).
  aiProvider: { type: String, enum: ['anthropic', 'openai', 'gemini', 'groq'], default: 'anthropic' },
  aiModel:    { type: String, default: '' },

  // Per-provider API keys set from the admin panel. Empty string means "not
  // set in DB" — the app falls back to the matching env var in that case
  // (see src/services/ai/config.js). Not a Mixed type, so Mongoose tracks
  // changes to these fields automatically.
  apiKeys: {
    anthropic: { type: String, default: '' },
    openai:    { type: String, default: '' },
    gemini:    { type: String, default: '' },
    groq:      { type: String, default: '' },
  },

  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AiConfig', aiConfigSchema);
