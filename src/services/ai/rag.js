const DocumentChunk = require('../../models/DocumentChunk');
const Book = require('../../models/Book');
const { callAI } = require('./providers');

const DEFAULT_TOP_K = 5;

/**
 * Retrieval-augmented search using MongoDB's built-in text index - no
 * external embedding provider required. Keyword-based, not semantic: it
 * matches on shared words/stems (via MongoDB's text index), not paraphrases.
 */
async function searchRAG(query, angkatan, { topK = DEFAULT_TOP_K, category } = {}) {
  const bookFilter = {
    isActive: true,
    $or: [{ activeFor: { $size: 0 } }, { activeFor: angkatan }],
  };
  if (category) bookFilter.category = category;

  const activeBookIds = await Book.find(bookFilter).distinct('_id');

  if (activeBookIds.length === 0) return { chunks: [], score: 0 };

  const results = await DocumentChunk.find(
    { bookId: { $in: activeBookIds }, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(topK)
    .lean();

  return {
    chunks: results,
    // Text search either finds matches or it doesn't - there's no
    // meaningful 0-1 similarity score like with vector search, so callers
    // that gate on "score < threshold" just need chunks.length to matter.
    score: results.length > 0 ? 1 : 0,
  };
}

/**
 * Most indexed textbooks (Hoffbrand, Guyton, Robbins, etc.) are in English,
 * but students ask in Indonesian - $text keyword search does stemming but
 * never translation, so "leukosit" matches nothing even when "leukocyte"
 * is right there in the book. Translate the query to English medical
 * search terms so the retry has a real chance of matching.
 */
async function translateQueryToEnglish(query, { provider, apiKey, model } = {}) {
  if (!apiKey) return null;
  try {
    const { text } = await callAI(
      'Translate the following medical/biology question into a short English search phrase (3-8 key medical terms, no explanation, no punctuation, no quotes). Reply with ONLY the phrase.',
      query,
      { maxTokens: 40, provider, apiKey, model }
    );
    return text.trim().replace(/^["']|["']$/g, '') || null;
  } catch (err) {
    console.error('[rag] gagal menerjemahkan query:', err.message);
    return null;
  }
}

/**
 * searchRAG with an automatic English-translation retry when the first
 * (as-typed) search comes back empty. Covers the common case of an
 * Indonesian question against an English-language textbook without adding
 * latency to queries that already match.
 */
async function searchRAGWithFallback(query, angkatan, { topK, category, provider, apiKey, model } = {}) {
  const first = await searchRAG(query, angkatan, { topK, category });
  if (first.chunks.length > 0) return first;

  const translated = await translateQueryToEnglish(query, { provider, apiKey, model });
  if (!translated) return first;

  const retry = await searchRAG(translated, angkatan, { topK, category });
  return retry.chunks.length > 0 ? retry : first;
}

function formatChunks(chunks) {
  if (!chunks.length) return '(Tidak ada konteks relevan)';
  return chunks
    .map((c, i) => `[${i + 1}] Sumber: ${c.bookTitle || 'Buku'}${c.chapter ? `, Bab ${c.chapter}` : ''}${c.pageNumber ? `, hal. ${c.pageNumber}` : ''}\n${c.content}`)
    .join('\n\n');
}

function toSources(chunks) {
  return chunks.map((c) => ({ bookId: c.bookId, bookTitle: c.bookTitle, chapter: c.chapter, page: c.pageNumber }));
}

module.exports = { searchRAG, searchRAGWithFallback, formatChunks, toSources };
