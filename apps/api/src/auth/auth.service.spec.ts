import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

describe('AuthService', () => {
  const email = 'diego@example.com';
  const password = 'uma-senha-forte-para-teste';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(password);
  });

  function service(overrides: Record<string, string> = {}) {
    return new AuthService(
      new ConfigService({
        NODE_ENV: 'production',
        AUTH_ENABLED: 'true',
        AUTH_EMAIL: email,
        AUTH_PASSWORD_HASH: passwordHash,
        AUTH_SESSION_SECRET:
          'segredo-de-sessao-com-mais-de-trinta-e-dois-caracteres',
        ...overrides,
      }),
    );
  }

  function request(cookie?: string) {
    return {
      ip: '127.0.0.1',
      headers: cookie ? { cookie } : {},
    } as Request;
  }

  it('creates and validates a secure single-user session', async () => {
    const auth = service();
    let sessionCookie = '';
    const response = {
      cookie: jest.fn((name: string, value: string) => {
        sessionCookie = `${name}=${value}`;
      }),
    } as unknown as Response;

    await expect(
      auth.login(email.toUpperCase(), password, request(), response),
    ).resolves.toMatchObject({ authenticated: true, email });
    expect(response.cookie).toHaveBeenCalledWith(
      'radiante_session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    );
    expect(auth.status(request(sessionCookie))).toEqual({
      enabled: true,
      authenticated: true,
      email,
    });
  });

  it('rejects invalid credentials without creating a cookie', async () => {
    const auth = service();
    const response = { cookie: jest.fn() } as unknown as Response;

    await expect(
      auth.login(email, 'senha-incorreta-comprida', request(), response),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('fails closed when production secrets are incomplete', () => {
    expect(() => service({ AUTH_SESSION_SECRET: '' })).toThrow(
      ServiceUnavailableException,
    );
  });

  it('keeps local development usable when authentication is disabled', () => {
    const auth = new AuthService(
      new ConfigService({ NODE_ENV: 'development', AUTH_ENABLED: 'false' }),
    );
    expect(auth.status(request())).toEqual({
      enabled: false,
      authenticated: true,
      email: null,
    });
  });
});
