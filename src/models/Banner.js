const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  imageBase64: { type: String, required: true }, // data URI, e.g. "data:image/jpeg;base64,..."
  linkUrl:     { type: String },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Banner', bannerSchema);
