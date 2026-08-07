import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class CredentialVaultService {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const configured = config.get<string>('INTEGRATION_ENCRYPTION_KEY')?.trim();
    this.key = configured ? this.parseKey(configured) : null;
  }

  configured() {
    return this.key !== null;
  }

  encrypt(value: unknown) {
    if (!this.key)
      throw new Error('INTEGRATION_ENCRYPTION_KEY não configurada.');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt<T>(payload: string): T {
    if (!this.key)
      throw new Error('INTEGRATION_ENCRYPTION_KEY não configurada.');
    const [version, encodedIv, encodedTag, encodedCiphertext] =
      payload.split('.');
    if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext) {
      throw new Error('Credencial criptografada inválida.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(encodedIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plaintext) as T;
  }

  private parseKey(value: string) {
    const key = /^[a-f\d]{64}$/i.test(value)
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64 ou 64 caracteres hexadecimais.',
      );
    }
    return key;
  }
}
