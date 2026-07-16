const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  imageBase64: { type: String, required: true }, // data URI, e.g. "data:image/jpeg;base64,..."
  linkUrl:     { type: String },
  placement:   { type: String, enum: ['dashboard', 'login'], default: 'dashboard' },
  // Focal point as % of image width/height (0-100), used as object-position /
  // background-position wherever the image gets cropped to fit a container
  // with a different aspect ratio than the original upload.
  focalX:      { type: Number, default: 50, min: 0, max: 100 },
  focalY:      { type: Number, default: 50, min: 0, max: 100 },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Banner', bannerSchema);
