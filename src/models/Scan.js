const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true },
    issueCount: { type: Number, required: true },
    issues: [
      {
        category: String,
        severity: String,
        title: String,
        fix: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scan', scanSchema);