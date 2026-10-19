const { safeFetch } = require('../utils/safeFetch');

async function checkCookies(url) {
  const response = await safeFetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  const issues = [];
  for (const cookie of cookies) {
    const parts = cookie.split(';').map((p) => p.trim().toLowerCase());
    const name = cookie.split('=')[0].trim();
    const isHttps = url.startsWith('https');

    if (!parts.includes('httponly')) {
      issues.push({
        category: 'Cookies',
        severity: 'medium',
        title: `Cookie "${name}" missing HttpOnly`,
        fix: 'Add the HttpOnly flag so JavaScript cannot read the cookie (limits XSS damage).',
      });
    }
    if (isHttps && !parts.includes('secure')) {
      issues.push({
        category: 'Cookies',
        severity: 'medium',
        title: `Cookie "${name}" missing Secure`,
        fix: 'Add the Secure flag so the cookie is only sent over HTTPS.',
      });
    }
    if (!parts.some((p) => p.startsWith('samesite'))) {
      issues.push({
        category: 'Cookies',
        severity: 'low',
        title: `Cookie "${name}" missing SameSite`,
        fix: 'Set SameSite=Lax or Strict to reduce CSRF risk.',
      });
    }
  }
  return issues;
}

module.exports = { checkCookies };