const express = require('express');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { uploadPdf } = require('../middleware/upload');
const ctrl = require('../controllers/bookController');

const router = express.Router();

router.use(auth);

// Mahasiswa & admin boleh melihat daftar buku (PRD §10 - "Lihat materi/buku" untuk semua role)
router.get('/', ctrl.listBooks);
router.get('/:id', ctrl.getBook);
router.get('/:id/file', ctrl.getBookFile);

// Mutasi & operasi admin-only
router.post('/', adminOnly, uploadPdf.single('file'), ctrl.uploadBook);
router.patch('/:id', adminOnly, ctrl.updateBook);
router.delete('/:id', adminOnly, ctrl.deleteBook);
router.post('/:id/reindex', adminOnly, ctrl.reindexBook);
router.get('/:id/chunks', adminOnly, ctrl.getBookChunks);

module.exports = router;
