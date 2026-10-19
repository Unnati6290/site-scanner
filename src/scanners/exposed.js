const { safeFetch } = require("../utils/safeFetch");

const TARGETS = [
  {
    path: '/.env',
    severity: 'critical',
    title: '.env file is publicly accessible',
    fix: 'Block access to .env in your server config and rotate any secrets it contains.',
    looksReal: (text) => /^[A-Z0-9_]+\s*=/m.test(text),
  },
  {
    path: '/.git/HEAD',
    severity: 'critical',
    title: 'Git repository is publicly accessible',
    fix: 'Block access to the .git folder so source code and history cannot be downloaded.',
    looksReal: (text) => text.startsWith('ref:'),
  },
];

async function checkExposedFiles(url) {
  const origin = new URL(url).origin;
  const issues = [];

  for (const target of TARGETS) {
    try {
      const response = await safeFetch(origin + target.path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 200) {
        const text = (await response.text()).slice(0, 2000);
        // many sites return 200 for everything, so check the content too
        if (target.looksReal(text)) {
          issues.push({
            category: 'Exposed Files',
            severity: target.severity,
            title: target.title,
            fix: target.fix,
          });
        }
      }
    } catch {
      // timeout or network error on this path: skip it
    }
  }
  return issues;
}

module.exports = { checkExposedFiles };