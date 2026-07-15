const AiConfig = require('../../models/AiConfig');

const ENV_KEY_BY_PROVIDER = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
};

/**
 * Resolves Medina's active runtime config: RAG settings, prompt overrides,
 * and which AI provider/model/key to call. API key resolution order is
 * DB (set via admin panel) → matching .env var — so the app keeps working
 * with just .env until an admin sets a key in the UI.
 */
async function getAiConfig() {
  let config = await AiConfig.findOne().lean();
  if (!config) config = await AiConfig.create({});

  const aiProvider = config.aiProvider || 'anthropic';
  const dbKey = config.apiKeys?.[aiProvider];
  const apiKey = dbKey || process.env[ENV_KEY_BY_PROVIDER[aiProvider]] || '';

  return {
    topK: config.topK ?? 5,
    maxTokens: config.maxTokens ?? 1000,
    promptOverrides: config.promptOverrides || {},
    aiProvider,
    aiModel: config.aiModel || '',
    apiKey,
  };
}

module.exports = { getAiConfig, ENV_KEY_BY_PROVIDER };
