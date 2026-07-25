import crypto from 'node:crypto';

export function decrypt(password: string) {
  const [saltHex, ivHex, encryptedText] = '375642b4c960a69d18ac77008db3257b:2809c4647323dd13c6320634769e6dbe:30e208c0df6a0b7a8f8604fbdb249a0cce7572992be7a3248fc1a27f63fcb5c4896e7a23e2b3f71af7bbbf6cfe41b17d33eee46920dbe558ef7407c4b7367eaec798097faa9157665b616afda57a44af3489dc8afd0a69a5f8dcea5a924b21f7'.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
