const express = require('express');
const crypto = require('node:crypto');
const dns = require('node:dns/promises');
const net = require('node:net');
const Site = require('../models/Site');
const { safeFetch, assertPublicUrl } = require('../utils/safeFetch');

const router = express.Router();
const VERIFY_PATH = '/site-scanner-verify.txt';

function instructions(site) {
  return {
    file: { path: VERIFY_PATH, content: site.token },
    dns: { type: 'TXT', value: `site-scanner-verify=${site.token}` },
  };
}

// Register a site
router.post('/', async (req, res) => {
  let parsed;
  try {
    parsed = new URL(req.body.url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs allowed' });
  }

  try {
    await assertPublicUrl(parsed.origin);
  } catch {
    return res.status(400).json({ error: 'This target is not allowed or cannot be resolved' });
  }

  let site = await Site.findOne({ user: req.userId, origin: parsed.origin });
  if (!site) {
    site = await Site.create({
      user: req.userId,
      origin: parsed.origin,
      token: crypto.randomBytes(16).toString('hex'),
    });
  }

  res.status(201).json({
    id: site._id,
    origin: site.origin,
    verified: site.verified,
    instructions: instructions(site),
  });
});

// List my sites
router.get('/', async (req, res) => {
  const sites = await Site.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .select('origin verified verifiedAt token');
  res.json(sites);
});

// Check ownership
router.post('/:id/verify', async (req, res) => {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }
  const site = await Site.findOne({ _id: req.params.id, user: req.userId });
  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }
  if (site.verified) {
    return res.json({ verified: true });
  }

  let ok = false;

  // Method 1: verification file
  try {
    const response = await safeFetch(site.origin + VERIFY_PATH, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 200) {
      const text = (await response.text()).slice(0, 200).trim();
      console.log('got:', JSON.stringify(text), 'expected:', site.token);
      ok = text === site.token;
    }
  } catch {
    // unreachable or blocked: fall through to DNS
  }

  // Method 2: DNS TXT record
  if (!ok) {
    const host = new URL(site.origin).hostname;
    if (!net.isIP(host)) {
      try {
        const records = await dns.resolveTxt(host);
        ok = records.some((chunks) => chunks.join('') === `site-scanner-verify=${site.token}`);
      } catch {
        // no TXT records found
      }
    }
  }

  if (!ok) {
    return res.status(400).json({
      verified: false,
      error: 'Could not verify. Add the file or DNS record and try again.',
      instructions: instructions(site),
    });
  }

  site.verified = true;
  site.verifiedAt = new Date();
  await site.save();
  res.json({ verified: true });
});

module.exports = router;