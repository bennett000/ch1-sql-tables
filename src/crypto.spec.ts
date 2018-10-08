import { decrypt, encrypt } from './crypto';

describe('crypto functions', () => {
  describe('encrypt and decrypt functions', () => {
    it('encrypts an input', () => {
      expect(encrypt('password', 'foo')).not.toBe('foo');
    }); 

    it('throws on bad input strings', () => {
      expect(() => decrypt('password', 'foo')).toThrowError();
    });

    it('works end to end', () => {
      const pass = 'password';
      const payload = 'foo';
      const encrypted = encrypt(pass, payload);
      const decrypted = decrypt(pass, encrypted);
      expect(decrypted).toBe(payload);
    });
  });
});
