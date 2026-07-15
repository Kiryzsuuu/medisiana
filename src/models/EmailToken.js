const mongoose = require('mongoose');

const emailTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true },
  type:      { type: String, enum: ['verify_email', 'reset_password'] },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmailToken', emailTokenSchema);
