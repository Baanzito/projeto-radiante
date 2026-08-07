import { ConfigService } from '@nestjs/config';
import { CredentialVaultService } from './credential-vault.service';

describe('CredentialVaultService', () => {
  it('encrypts credentials with authenticated encryption and restores them', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const vault = new CredentialVaultService(
      new ConfigService({ INTEGRATION_ENCRYPTION_KEY: key }),
    );
    const encrypted = vault.encrypt({ refreshToken: 'secret-token' });

    expect(encrypted).not.toContain('secret-token');
    expect(vault.decrypt(encrypted)).toEqual({ refreshToken: 'secret-token' });
  });

  it('rejects an invalid encryption key at startup', () => {
    expect(
      () =>
        new CredentialVaultService(
          new ConfigService({ INTEGRATION_ENCRYPTION_KEY: 'short' }),
        ),
    ).toThrow('32 bytes');
  });
});
