const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  sources:   [{ bookTitle: String, chapter: String, page: Number }],
  createdAt: { type: Date, default: Date.now },
});

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
