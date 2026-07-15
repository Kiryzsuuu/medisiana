const { pageForOffset } = require('./toMarkdown');

const CHUNK_SIZE_WORDS = 500;
const OVERLAP_WORDS = 50;

/**
 * Splits the full combined document text into overlapping ~500-word chunks
 * on sentence boundaries. Unlike the old page-by-page chunker, this runs
 * across the whole document so a chunk is never severed mid-sentence just
 * because a PDF page happened to end there - each chunk is then attributed
 * to whichever source page its midpoint falls on, via pageRanges.
 * Input: text (string), pageRanges ([{pageNumber, start, end}])
 * Output: [{ content, pageNumber }]
 */
function chunkText(text, pageRanges) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || (text ? [text] : []);
  const chunks = [];

  let buffer = [];
  let wordCount = 0;
  let bufferStartOffset = 0;
  let cursor = 0;

  const flush = (endOffset) => {
    if (!buffer.length) return;
    const content = buffer.join('').trim();
    if (content) {
      const midOffset = Math.floor((bufferStartOffset + endOffset) / 2);
      chunks.push({ content, pageNumber: pageForOffset(pageRanges, midOffset) });
    }
  };

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (wordCount + words.length > CHUNK_SIZE_WORDS && wordCount > 0) {
      flush(cursor);
      const overlapText = buffer.join('').split(/\s+/).slice(-OVERLAP_WORDS).join(' ');
      bufferStartOffset = Math.max(0, cursor - overlapText.length);
      buffer = overlapText ? [`${overlapText} `] : [];
      wordCount = overlapText ? overlapText.split(/\s+/).filter(Boolean).length : 0;
    }
    buffer.push(sentence);
    wordCount += words.length;
    cursor += sentence.length;
  }
  flush(cursor);

  return chunks.filter((c) => c.content.length > 0);
}

module.exports = { chunkText };
