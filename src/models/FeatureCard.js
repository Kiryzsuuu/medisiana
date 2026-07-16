const mongoose = require('mongoose');

const featureCardSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  linkUrl:     { type: String, required: true },   // e.g. "chat.html"
  linkLabel:   { type: String, default: 'Buka' },   // e.g. "Mulai chat"
  icon:        { type: String, default: 'ti-bolt' }, // tabler icon class, e.g. "ti-robot"
  color:       { type: String, enum: ['blue', 'amber', 'green', 'purple', 'red', 'gray'], default: 'blue' },
  imageBase64: { type: String, default: '' },       // optional - if set, shown as card background instead of icon+color
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('FeatureCard', featureCardSchema);
