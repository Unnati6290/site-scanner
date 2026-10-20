const { assertPublicUrl } = require('../src/utils/safeFetch');

beforeAll(() => {
  delete process.env.ALLOW_PRIVATE_TARGETS; // make sure the protection is on
});

describe('assertPublicUrl', () => {
  const blocked = [
    'http://localhost',
    'http://127.0.0.1',
    'http://0.0.0.0',
    'http://10.0.0.5',
    'http://172.16.0.1',
    'http://192.168.1.1',
    'http://169.254.169.254',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
  ];

  test.each(blocked)('blocks %s', async (url) => {
    await expect(assertPublicUrl(url)).rejects.toMatchObject({ code: 'BLOCKED_TARGET' });
  });

  test.each(['ftp://example.com', 'file:///etc/passwd'])('blocks protocol in %s', async (url) => {
    await expect(assertPublicUrl(url)).rejects.toMatchObject({ code: 'BLOCKED_TARGET' });
  });

  test('allows a public IP address', async () => {
    await expect(assertPublicUrl('http://8.8.8.8')).resolves.toBeUndefined();
  });

  test('allows private targets only when the local test switch is on', async () => {
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    await expect(assertPublicUrl('http://127.0.0.1')).resolves.toBeUndefined();
    delete process.env.ALLOW_PRIVATE_TARGETS;
  });
});