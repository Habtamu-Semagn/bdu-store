import { randomBytes } from 'crypto';

/**
 * Crockford-style base32 alphabet: digits plus uppercase letters without
 * I, L, O and U, so a token cannot be misread as another token.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const BODY_LENGTH = 20;
const GROUP_SIZE = 4;

/**
 * Generates a storage token such as `BDU-4K7Q-9WXZ-2M5N-8PRT-6HJC`.
 *
 * 20 characters from a 32-symbol alphabet is 100 bits of entropy, drawn from
 * `crypto.randomBytes`, so tokens are unpredictable and cannot be guessed.
 * 256 is an exact multiple of 32, so the modulo introduces no bias.
 * Uniqueness is additionally guaranteed by the unique index on
 * `Device.storageToken`.
 */
export function generateStorageToken(): string {
  const bytes = randomBytes(BODY_LENGTH);
  let body = '';
  for (let i = 0; i < BODY_LENGTH; i += 1) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  const groups = body.match(new RegExp(`.{${GROUP_SIZE}}`, 'g')) ?? [body];
  return `BDU-${groups.join('-')}`;
}
