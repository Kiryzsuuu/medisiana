const multer = require('multer');

function pdfFilter(req, file, cb) {
  if (file.mimetype === 'application/pdf') return cb(null, true);
  cb(new Error('Hanya file PDF yang diperbolehkan'));
}

// PDFs are held in memory just long enough to stream straight into MongoDB
// GridFS (see src/config/gridfs.js) - nothing touches local disk.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = { uploadPdf };
