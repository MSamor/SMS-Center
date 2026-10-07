import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const secret = (prefix) => `${prefix}_${randomBytes(32).toString('base64url')}`;
export function cipherBox(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error('Encryption key must be exactly 32 bytes');
  return {
    encrypt(value, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(value), 'utf8'),
        cipher.final(),
      ]);
      return `v1.${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
    },
    decrypt(value, context) {
      const [version, iv, tag, encrypted] = value.split('.');
      if (version !== 'v1') throw new Error('Unknown ciphertext version');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'), {
        authTagLength: 16,
      });
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(encrypted, 'base64')),
          decipher.final(),
        ]).toString('utf8'),
      );
    },
  };
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, saved) {
  const [salt, hash] = saved.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = await derive(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
