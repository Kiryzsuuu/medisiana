const mongoose = require('mongoose');

const studyRoomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  type:        { type: String, enum: ['public', 'private'], default: 'public' },
  topic:       { type: String },
  inviteCode:  { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyRoom', studyRoomSchema);
