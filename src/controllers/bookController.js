const Book = require('../models/Book');
const DocumentChunk = require('../models/DocumentChunk');
const { parsePdf } = require('../services/pdf/parser');
const { ocrLowTextPages } = require('../services/pdf/ocr');
const { pagesToMarkdown } = require('../services/pdf/toMarkdown');
const { chunkText } = require('../services/pdf/chunker');
const { uploadPdfBuffer, downloadPdfBuffer, deletePdf, openDownloadStream } = require('../config/gridfs');
const { sendMail } = require('../services/mailer/sender');

/**
 * Indexing runs in-process (no Redis/Bull queue in this build) but is fired
 * asynchronously so the upload request returns immediately with status "pending".
 * No external embedding API is used - chunks are searched via MongoDB's own
 * text index (see src/services/ai/rag.js).
 */
async function indexBook(book) {
  try {
    book.indexStatus = 'processing';
    await book.save();

    const buffer = await downloadPdfBuffer(book.gridFsId);
    const rawPages = await parsePdf(buffer);

    // Pages with little/no extractable text (scanned pages, image-only
    // figures) get a second pass through OCR so their content isn't silently
    // dropped from the knowledge base. Capped internally so a fully-scanned
    // book doesn't stall indexing for hours.
    const { pages, ocrPageCount } = await ocrLowTextPages(buffer, rawPages);
    if (ocrPageCount > 0) console.log(`[bookController] OCR memulihkan teks dari ${ocrPageCount} halaman untuk "${book.title}"`);

    const { text, pageRanges } = pagesToMarkdown(pages);
    const rawChunks = chunkText(text, pageRanges);

    const BATCH = 200;
    let totalChunks = 0;
    for (let i = 0; i < rawChunks.length; i += BATCH) {
      const batch = rawChunks.slice(i, i + BATCH);
      await DocumentChunk.insertMany(
        batch.map((c) => ({
          bookId: book._id,
          bookTitle: book.title,
          content: c.content,
          pageNumber: c.pageNumber,
        }))
      );
      totalChunks += batch.length;
    }

    book.totalChunks = totalChunks;
    book.indexStatus = 'done';
    await book.save();

    if (book.uploadedByEmail) {
      await sendMail('index-done', book.uploadedByEmail, { bookTitle: book.title, totalChunks });
    }
  } catch (err) {
    console.error('[bookController] indexing gagal:', err.message);
    book.indexStatus = 'error';
    book.indexError = err.message;
    await book.save();
  }
}

async function listBooks(req, res, next) {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Mahasiswa hanya melihat buku aktif yang berlaku untuk angkatan mereka
    if (req.user.role !== 'admin') {
      filter.isActive = true;
      filter.$or = [{ activeFor: { $size: 0 } }, { activeFor: req.user.angkatan }];
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json({ books });
  } catch (err) {
    next(err);
  }
}

async function uploadBook(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File PDF wajib diunggah' });
    const { title, author, category, edition, activeFor } = req.body;
    if (!title) return res.status(400).json({ error: 'title wajib diisi' });

    const gridFsId = await uploadPdfBuffer(req.file.buffer, req.file.originalname);

    const book = await Book.create({
      title,
      author,
      category,
      edition,
      fileName: req.file.originalname,
      gridFsId,
      activeFor: activeFor ? String(activeFor).split(',').map(Number) : [],
      uploadedBy: req.user._id,
    });

    indexBookSafe(book, req.user.email);

    res.status(201).json({ book });
  } catch (err) {
    next(err);
  }
}

function indexBookSafe(bookDoc, uploaderEmail) {
  bookDoc.uploadedByEmail = uploaderEmail;
  indexBook(bookDoc).catch((e) => console.error('[bookController] index error:', e));
}

async function getBook(req, res, next) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Buku tidak ditemukan' });
    res.json({ book });
  } catch (err) {
    next(err);
  }
}

async function getBookFile(req, res, next) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || !book.gridFsId) return res.status(404).json({ error: 'File tidak ditemukan' });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(book.fileName || book.title + '.pdf')}"`);
    openDownloadStream(book.gridFsId)
      .on('error', () => res.status(404).end())
      .pipe(res);
  } catch (err) {
    next(err);
  }
}

async function updateBook(req, res, next) {
  try {
    const { title, category, isActive, activeFor } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (category !== undefined) update.category = category;
    if (isActive !== undefined) update.isActive = isActive;
    if (activeFor !== undefined) update.activeFor = activeFor;

    const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!book) return res.status(404).json({ error: 'Buku tidak ditemukan' });
    res.json({ book });
  } catch (err) {
    next(err);
  }
}

async function deleteBook(req, res, next) {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Buku tidak ditemukan' });
    await DocumentChunk.deleteMany({ bookId: book._id });
    if (book.gridFsId) {
      await deletePdf(book.gridFsId).catch((e) => console.warn('[bookController] gagal hapus file GridFS:', e.message));
    }
    res.json({ message: 'Buku dan seluruh chunks dihapus' });
  } catch (err) {
    next(err);
  }
}

async function reindexBook(req, res, next) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Buku tidak ditemukan' });
    await DocumentChunk.deleteMany({ bookId: book._id });
    book.indexStatus = 'pending';
    book.totalChunks = 0;
    await book.save();
    indexBookSafe(book, req.user.email);
    res.json({ message: 'Re-index dimulai', book });
  } catch (err) {
    next(err);
  }
}

async function getBookChunks(req, res, next) {
  try {
    const chunks = await DocumentChunk.find({ bookId: req.params.id }).limit(50);
    res.json({ chunks });
  } catch (err) {
    next(err);
  }
}

module.exports = { listBooks, uploadBook, getBook, getBookFile, updateBook, deleteBook, reindexBook, getBookChunks };
