const dns = require('node:dns/promises');
const net = require('node:net');

function blocked(message) {
  const err = new Error(message);
  err.code = 'BLOCKED_TARGET';
  return err;
}

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||          // cloud metadata, link-local
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a >= 224                              // multicast and reserved
  );
}

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80')) return true;                         // link-local
    if (lower.startsWith('::ffff:')) {                                 // IPv4-mapped
      const v4 = lower.slice(7);
      return net.isIPv4(v4) ? isPrivateIPv4(v4) : true;
    }
    return false;
  }
  return true; // not a valid IP at all: treat as unsafe
}

async function assertPublicUrl(urlString) {
  const url = new URL(urlString);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw blocked('Only http/https allowed');
  }
  // local testing switch, never enable this in production
  if (process.env.ALLOW_PRIVATE_TARGETS === 'true') return;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateIP(host)) throw blocked('Private addresses are not allowed');
    return;
  }

  const addresses = await dns.lookup(host, { all: true });
  if (addresses.some((a) => isPrivateIP(a.address))) {
    throw blocked('Private addresses are not allowed');
  }
}

// Like fetch, but checks every hop, including redirects
async function safeFetch(url, options = {}) {
  const follow = options.redirect !== 'manual';
  let current = url;

  for (let hop = 0; hop <= 3; hop++) {
    await assertPublicUrl(current);
    const response = await fetch(current, { ...options, redirect: 'manual' });

    const location = response.headers.get('location');
    if (follow && response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects');
}

module.exports = { safeFetch, assertPublicUrl };