import crypto from 'node:crypto';

export function decrypt(password: string) {
  const [saltHex, ivHex, encryptedText] = process.env.CBTCODE?.split(':')!;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function hash(data: string) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
