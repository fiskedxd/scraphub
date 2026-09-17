const mongoose = require('mongoose');

const bannedIPSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  reason: {
    type: String,
    default: 'Comportement suspect'
  },
  bannedAt: {
    type: Date,
    default: Date.now
  },
  bannedBy: {
    type: String,
    default: 'system'
  },
  expiresAt: {
    type: Date,
    default: null 
  }
});


bannedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('BannedIP', bannedIPSchema);
