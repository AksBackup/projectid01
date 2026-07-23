const mongoose = require('mongoose');

// Matches the schema in the main astric website server exactly
const replySchema = new mongoose.Schema({
  body:      { type: String, required: true },
  sentAt:    { type: Date, default: Date.now },
  sentBy:    { type: String }, // admin email
}, { _id: false });

const contactSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  company: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status:  { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  source:  { type: String, default: 'website' },
  replies: { type: [replySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
