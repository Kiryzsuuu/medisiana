const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  author:      { type: String },
  category:    { type: String },
  edition:     { type: String },
  fileName:    { type: String },                          // nama file asli saat diunggah
  gridFsId:    { type: mongoose.Schema.Types.ObjectId },   // referensi ke file PDF di GridFS (bucket "book_pdfs")
  isActive:    { type: Boolean, default: true },
  activeFor:   [{ type: Number }],
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  indexStatus: { type: String, enum: ['pending', 'processing', 'done', 'error'], default: 'pending' },
  indexError:  { type: String },
  totalChunks: { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Book', bookSchema);
