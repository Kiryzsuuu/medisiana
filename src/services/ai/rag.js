const DocumentChunk = require('../../models/DocumentChunk');
const Book = require('../../models/Book');

const DEFAULT_TOP_K = 5;

/**
 * Retrieval-augmented search using MongoDB's built-in text index — no
 * external embedding provider required. Keyword-based, not semantic: it
 * matches on shared words/stems (via MongoDB's text index), not paraphrases.
 */
async function searchRAG(query, angkatan, { topK = DEFAULT_TOP_K } = {}) {
  const activeBookIds = await Book.find({
    isActive: true,
    $or: [{ activeFor: { $size: 0 } }, { activeFor: angkatan }],
  }).distinct('_id');

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
    // Text search either finds matches or it doesn't — there's no
    // meaningful 0-1 similarity score like with vector search, so callers
    // that gate on "score < threshold" just need chunks.length to matter.
    score: results.length > 0 ? 1 : 0,
  };
}

function formatChunks(chunks) {
  if (!chunks.length) return '(Tidak ada konteks relevan)';
  return chunks
    .map((c, i) => `[${i + 1}] 📖 ${c.bookTitle || 'Buku'}${c.chapter ? `, Bab ${c.chapter}` : ''}${c.pageNumber ? `, hal. ${c.pageNumber}` : ''}\n${c.content}`)
    .join('\n\n');
}

function toSources(chunks) {
  return chunks.map((c) => ({ bookTitle: c.bookTitle, chapter: c.chapter, page: c.pageNumber }));
}

module.exports = { searchRAG, formatChunks, toSources };
