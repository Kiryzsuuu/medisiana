const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
  bookId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  bookTitle:  { type: String },
  content:    { type: String, required: true },
  pageNumber: { type: Number },
  chapter:    { type: String },
  metadata:   { type: mongoose.Schema.Types.Mixed },
  createdAt:  { type: Date, default: Date.now },
});

documentChunkSchema.index({ bookId: 1 });
// Keyword search index — RAG retrieval runs entirely on MongoDB's own text
// search, no external embedding provider required.
documentChunkSchema.index({ content: 'text' });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
