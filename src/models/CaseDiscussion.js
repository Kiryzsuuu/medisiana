const mongoose = require('mongoose');

const caseDiscussionSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  content:  { type: String, required: true },
  category: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content:   { type: String },
    isAi:      { type: Boolean, default: false },
    sources:   [{ bookTitle: String, chapter: String, page: Number }],
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CaseDiscussion', caseDiscussionSchema);
