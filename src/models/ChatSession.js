const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, default: 'Sesi Baru' },
  mode:      { type: String, enum: ['chat', 'quiz'], default: 'chat' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
