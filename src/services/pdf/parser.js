const pdfParse = require('pdf-parse');

/**
 * Extracts text from a PDF buffer, split into pages.
 * Returns an array of { pageNumber, text }.
 */
async function parsePdf(buffer) {
  const pages = [];

  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pages.push({ pageNumber: pages.length + 1, text });
      return text;
    },
  });

  return pages;
}

module.exports = { parsePdf };
