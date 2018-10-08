import { createCipher, createDecipher } from 'crypto';
import { CipherAlgorithms } from './interfaces';

export function encrypt(
  passphrase: string,
  toEncrypt: string,
  algo: CipherAlgorithms = 'blowfish'
) {
  const cipher = createCipher(algo, passphrase);

  let encrypted = cipher.update(toEncrypt, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(
  passphrase: string,
  encrypted: string,
  algo: CipherAlgorithms = 'blowfish'
) {
  const decipher = createDecipher(algo, passphrase);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
