const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

const MIN_CHARS = 100;   // pages with less extracted text than this are treated as "nearly empty"
const MAX_OCR_PAGES = 60; // hard cap per book so a fully-scanned 600-page book doesn't stall indexing for hours

/** Renders a single PDF page to a PNG buffer using @napi-rs/canvas (no native build tools required). */
class NapiCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function renderPageToPng(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.0 });
  const factory = new NapiCanvasFactory();
  const canvasAndContext = factory.create(viewport.width, viewport.height);
  await page.render({ canvasContext: canvasAndContext.context, viewport, canvasFactory: factory }).promise;
  return canvasAndContext.canvas.toBuffer('image/png');
}

/**
 * Fills in text for pages pdf-parse extracted little/nothing from - typically
 * scanned pages with no embedded text layer. Runs OCR only on those pages
 * (capped at MAX_OCR_PAGES) so normal text-based PDFs aren't slowed down.
 * Mutates nothing; returns a new pages array with `.text` upgraded where OCR
 * found more content than the original extraction.
 */
async function ocrLowTextPages(pdfBuffer, pages, { minChars = MIN_CHARS, maxPages = MAX_OCR_PAGES } = {}) {
  const candidates = pages
    .map((p, i) => ({ index: i, chars: (p.text || '').trim().length }))
    .filter((p) => p.chars < minChars)
    .slice(0, maxPages);

  if (!candidates.length) return { pages, ocrPageCount: 0 };

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise;
  const worker = await createWorker('eng+ind');

  const updated = [...pages];
  let ocrPageCount = 0;

  try {
    for (const { index } of candidates) {
      const pageNumber = updated[index].pageNumber;
      try {
        const png = await renderPageToPng(pdfDoc, pageNumber);
        const { data } = await worker.recognize(png);
        const ocrText = (data.text || '').trim();
        if (ocrText.length > (updated[index].text || '').trim().length) {
          updated[index] = { ...updated[index], text: ocrText };
          ocrPageCount++;
        }
      } catch (err) {
        console.error(`[ocr] gagal OCR halaman ${pageNumber}:`, err.message);
      }
    }
  } finally {
    await worker.terminate();
  }

  return { pages: updated, ocrPageCount };
}

module.exports = { ocrLowTextPages };
