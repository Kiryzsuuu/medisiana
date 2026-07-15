const mongoose = require('mongoose');

const wellnessLogSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: String, required: true }, // "YYYY-MM-DD", one entry per user per day
  sleepHours:  { type: Number, min: 0, max: 24 },
  studyHours:  { type: Number, min: 0, max: 24 },
  stressLevel: { type: Number, min: 1, max: 5 }, // 1 = santai, 5 = sangat tertekan
  mood:        { type: String, enum: ['great', 'good', 'okay', 'stressed', 'exhausted'] },
  note:        { type: String },
  createdAt:   { type: Date, default: Date.now },
});

wellnessLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WellnessLog', wellnessLogSchema);
