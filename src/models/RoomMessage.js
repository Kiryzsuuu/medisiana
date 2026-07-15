const mongoose = require('mongoose');

const roomMessageSchema = new mongoose.Schema({
  roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'StudyRoom', required: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderType: { type: String, enum: ['user', 'ai'], required: true },
  content:    { type: String, required: true },
  sources:    [{ bookTitle: String, chapter: String, page: Number }],
  createdAt:  { type: Date, default: Date.now },
});

roomMessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('RoomMessage', roomMessageSchema);
