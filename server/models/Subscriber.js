const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email:  { type: String, required: true, unique: true, trim: true, lowercase: true },
  source: { type: String, default: 'website' },
  active: { type: Boolean, default: true },
  announcementSentAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
