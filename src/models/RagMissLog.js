const mongoose = require('mongoose');

const ragMissLogSchema = new mongoose.Schema({
  question:  { type: String, required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RagMissLog', ragMissLogSchema);
