const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:      { type: String, unique: true, required: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  fullName:   { type: String, required: true },
  role:       { type: String, enum: ['student', 'admin'], default: 'student' },
  angkatan:   { type: Number },
  avatarUrl:  { type: String },
  phone:      { type: String },
  address:    { type: String },
  university: { type: String },
  bio:        { type: String },
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
