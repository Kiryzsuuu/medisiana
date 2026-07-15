/**
 * Normalizes raw per-page PDF text into one continuous, whitespace-clean
 * document instead of leaving it fragmented per page. Two problems this
 * solves at once:
 *
 * 1. Token weight: PDF extraction leaves lots of redundant whitespace and
 *    hyphenated line-break artifacts ("informa- tion") - collapsing that
 *    shrinks the text substantially before it ever reaches the chunker/AI.
 * 2. Chunk quality: the old per-page chunker reset at every page boundary,
 *    so a chunk could be severed mid-sentence right where a PDF page ended.
 *    Concatenating into one document lets chunking run on sentence
 *    boundaries across page breaks - see chunker.js.
 *
 * Each source page's character range in the combined text is tracked so a
 * chunk built from the combined text can still be attributed to a page
 * number for citations (see pageForOffset).
 */
function pagesToMarkdown(pages) {
  let text = '';
  const pageRanges = [];

  for (const { pageNumber, text: pageText } of pages) {
    const cleaned = (pageText || '')
      .replace(/-\s+(?=[a-z])/g, '') // rejoin hyphenated line-break words
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) continue;

    const start = text.length;
    text += (text ? ' ' : '') + cleaned;
    pageRanges.push({ pageNumber, start, end: text.length });
  }

  return { text, pageRanges };
}

/** Finds which source page a character offset in the combined text fell on. */
function pageForOffset(pageRanges, offset) {
  for (const r of pageRanges) {
    if (offset >= r.start && offset < r.end) return r.pageNumber;
  }
  return pageRanges.length ? pageRanges[pageRanges.length - 1].pageNumber : undefined;
}

module.exports = { pagesToMarkdown, pageForOffset };
