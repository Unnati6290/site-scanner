const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    origin: { type: String, required: true },
    token: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
  },
  { timestamps: true }
);

// one registration per user per site
siteSchema.index({ user: 1, origin: 1 }, { unique: true });

module.exports = mongoose.model('Site', siteSchema);