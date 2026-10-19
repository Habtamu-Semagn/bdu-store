import { generateStorageToken } from './storage-token';

describe('generateStorageToken', () => {
  it('uses the BDU- prefix and groups of four', () => {
    expect(generateStorageToken()).toMatch(/^BDU-[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
  });

  it('never contains the ambiguous letters I, L, O or U in the random body', () => {
    for (let i = 0; i < 200; i += 1) {
      // The fixed "BDU-" prefix is excluded: only the random part matters.
      const body = generateStorageToken().replace(/^BDU-/, '');
      expect(body).not.toMatch(/[ILOU]/);
    }
  });

  it('produces a different token almost every time', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      tokens.add(generateStorageToken());
    }
    expect(tokens.size).toBe(2000);
  });

  it('carries at least 100 bits of randomness', () => {
    // 20 characters from a 32-symbol alphabet => 20 * 5 = 100 bits.
    const body = generateStorageToken().replace(/^BDU-/, '').replace(/-/g, '');
    expect(body).toHaveLength(20);
  });
});
