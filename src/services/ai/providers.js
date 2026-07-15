/**
 * Unified multi-provider AI caller. Medina's system prompt + RAG pipeline
 * stay provider-agnostic — only this module knows the wire format for each
 * provider's API. Admin picks the active provider (and optionally the API
 * key + model) from the admin panel; see src/services/ai/config.js for how
 * that resolves against .env fallbacks.
 */

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
};

async function callAnthropic({ apiKey, model, systemPrompt, userMessage, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.anthropic,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { text, usage: data.usage };
}

async function callOpenAiCompatible(baseUrl, { apiKey, model, systemPrompt, userMessage, maxTokens, fallbackModel }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || fallbackModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) throw new Error(`API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text, usage: data.usage };
}

async function callGemini({ apiKey, model, systemPrompt, userMessage, maxTokens }) {
  const useModel = model || DEFAULT_MODELS.gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).join('\n');
  return { text, usage: data.usageMetadata };
}

/**
 * Calls Medina's configured AI provider.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {{ maxTokens?: number, provider: string, apiKey: string, model?: string }} opts
 */
async function callAI(systemPrompt, userMessage, { maxTokens = 1000, provider, apiKey, model } = {}) {
  if (!apiKey) {
    throw new Error(`API key untuk provider "${provider}" belum diatur. Set di panel admin atau file .env.`);
  }

  switch (provider) {
    case 'anthropic':
      return callAnthropic({ apiKey, model, systemPrompt, userMessage, maxTokens });
    case 'openai':
      return callOpenAiCompatible('https://api.openai.com/v1', { apiKey, model, systemPrompt, userMessage, maxTokens, fallbackModel: DEFAULT_MODELS.openai });
    case 'groq':
      return callOpenAiCompatible('https://api.groq.com/openai/v1', { apiKey, model, systemPrompt, userMessage, maxTokens, fallbackModel: DEFAULT_MODELS.groq });
    case 'gemini':
      return callGemini({ apiKey, model, systemPrompt, userMessage, maxTokens });
    default:
      throw new Error(`Provider AI tidak dikenal: ${provider}`);
  }
}

module.exports = { callAI, DEFAULT_MODELS };
