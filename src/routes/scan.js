const express = require('express');
const { checkHeaders } = require('../scanners/headers');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL'});
  }
  if(!['http:', 'https:'].includes(parsed.protocol)){
    return res.status(400).json({ error: 'Only http/https URLs allowed'});
  }

  try{
    const issues = await checkHeaders(parsed.href);
    res.json({ url: parsed.href, issueCount: issues.length, issues});
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the target site' });
  }
});

module.exports = router;