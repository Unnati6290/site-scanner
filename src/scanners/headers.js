const { safeFetch } = require('../utils/safeFetch');

const CHECKS = [
  {
    header: 'strict-transport-security',
    severity: 'high',
    title: 'HSTS header missing',
    fix: 'Add Strict-Transport-Security so browsers always use HTTPS.',
  },

  {
    header: 'content-security-policy',
    severity: 'high',
    title: 'Content-Security-Policy missing',
    fix: 'Add a CSP to limit where scripts and resources can load from, reducing XSS risk.',
  },

  {
    header: 'x-frame-options',
    severity: 'medium',
    title: 'X-Frame-Options missing',
    fix: 'Add X-Frame-options (or CSP frame-ancestors) to prevent clickjacking.',
  },

  {
    header: 'x-content-type-options',
    severity: 'low',
    title: 'X-Content-Type-Options missing',
    fix: 'Set X-Content-Type-Options: nosniff to stop MIME-type sniffing.',
  },

  {
    header: 'referrer-policy',
    severity: 'low',
    title: 'Referrer-Policy missing',
    fix: 'Set a Referrer-Policy to avoid leaking URLs to other sites.',
  },
];

async function checkHeaders(url){
  const response = await safeFetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  const issues = [];
  for(const check of CHECKS){
    if(!response.headers.has(check.header)){
      issues.push({
        category: 'Security Headers',
        severity: check.severity,
        title: check.title,
        fix: check.fix,
      });
    }
  }
  return issues;
}

module.exports = { checkHeaders};