const CHUNK_SIZE_WORDS = 500;
const OVERLAP_WORDS = 50;

/**
 * Splits per-page text into overlapping chunks (~500 words, 50 overlap),
 * preserving paragraph boundaries where possible.
 * Input: [{ pageNumber, text }]
 * Output: [{ content, pageNumber }]
 */
function chunkPages(pages) {
  const chunks = [];

  for (const { pageNumber, text } of pages) {
    const paragraphs = text.split(/\n{2,}|(?<=[.!?])\s{2,}/).filter((p) => p.trim());
    let buffer = [];
    let wordCount = 0;

    const flush = () => {
      if (buffer.length) {
        chunks.push({ content: buffer.join(' ').trim(), pageNumber });
        buffer = [];
        wordCount = 0;
      }
    };

    for (const para of paragraphs) {
      const words = para.trim().split(/\s+/);
      if (wordCount + words.length > CHUNK_SIZE_WORDS && wordCount > 0) {
        flush();
        const overlapWords = buffer.join(' ').split(/\s+/).slice(-OVERLAP_WORDS);
        buffer = overlapWords.length ? [overlapWords.join(' ')] : [];
        wordCount = overlapWords.length;
      }
      buffer.push(para.trim());
      wordCount += words.length;
    }
    flush();
  }

  return chunks.filter((c) => c.content.length > 0);
}

module.exports = { chunkPages };
