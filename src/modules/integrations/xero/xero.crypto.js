import crypto from 'node:crypto';

const VERSION = 1;
export function parseEncryptionKey(encoded) {
  if (!encoded) throw new Error('Xero token encryption is not configured.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    throw new Error('XERO_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function encryptToken(value, encodedKey) {
  const key = parseEncryptionKey(encodedKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptToken(envelope, encodedKey) {
  try {
    const [version, iv, tag, ciphertext] = envelope.split('.');
    if (Number(version) !== VERSION || !iv || !tag || !ciphertext) throw new Error();
    const decipher = crypto.createDecipheriv('aes-256-gcm', parseEncryptionKey(encodedKey), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Stored Xero token could not be authenticated.');
  }
}
