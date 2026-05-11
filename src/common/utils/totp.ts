import * as crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = Buffer.allocUnsafe(Math.floor((str.length * 5) / 8));

  for (const char of str) {
    const charIndex = BASE32_CHARS.indexOf(char);
    if (charIndex === -1) throw new Error(`Invalid base32 char: ${char}`);
    value = (value << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return output.subarray(0, index);
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = '';

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function generateTotpToken(secret: string, time = Date.now()): string {
  const counter = Math.floor(time / 1000 / 30);
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  const high = Math.floor(counter / 2 ** 32);
  const low = counter >>> 0;
  buf.writeUInt32BE(high, 0);
  buf.writeUInt32BE(low, 4);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

export function verifyTotpToken(
  token: string,
  secret: string,
  window = 1,
): boolean {
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const expected = generateTotpToken(secret, now + i * 30_000);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

export function generateTotpUri(
  email: string,
  issuer: string,
  secret: string,
): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
