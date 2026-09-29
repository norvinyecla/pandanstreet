import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the original password against its hash', async () => {
    const hash = await hashPassword('correct horse');
    await expect(verifyPassword('correct horse', hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse');
    await expect(verifyPassword('wrong horse', hash)).resolves.toBe(false);
  });

  it('salts each hash so the same password hashes differently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');
    expect(first).not.toBe(second);
    expect(first).not.toContain('same-password');
  });

  it('returns false for a malformed stored hash', async () => {
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
    await expect(verifyPassword('anything', 'nocolon')).resolves.toBe(false);
  });
});
