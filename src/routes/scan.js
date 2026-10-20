const Site = require('../models/Site');
const Scan = require('../models/Scan');
const express = require('express');
const { checkHeaders } = require('../scanners/headers');
const { checkCookies } = require('../scanners/cookies');
const { checkExposedFiles } = require('../scanners/exposed');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;

  // Validate input: never trust what users send you
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs allowed' });
  }

    const site = await Site.findOne({ user: req.userId, origin: parsed.origin, verified: true });
  if (!site) {
    return res.status(403).json({ error: 'Verify ownership of this site before scanning it' });
  }

    try {
    const results = await Promise.all([
      checkHeaders(parsed.href),
      checkCookies(parsed.href),
      checkExposedFiles(parsed.href),
    ]);
    const issues = results.flat();

    const scan = await Scan.create({
      user: req.userId,
      url: parsed.href,
      issueCount: issues.length,
      issues,
    });

    res.json({ id: scan._id, url: scan.url, issueCount: scan.issueCount, issues: scan.issues });
    } catch (err) {
    if (err.code === 'BLOCKED_TARGET') {
      return res.status(400).json({ error: 'This target is not allowed' });
    }
    console.error(err);
    res.status(502).json({ error: 'Could not reach the target site' });
  }
});

// List my past scans (newest first)
router.get('/', async (req, res) => {
  const scans = await Scan.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('url issueCount createdAt');
  res.json(scans);
});

// Get one of my scans in full
router.get('/:id', async (req, res) => {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid scan id' });
  }
  // filter by user too, so people can't read each other's scans
  const scan = await Scan.findOne({ _id: req.params.id, user: req.userId });
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }
  res.json(scan);
});

module.exports = router;