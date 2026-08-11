import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { verifyPassword } from './password';

const SESSION_COOKIE = 'radiante_session';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

interface SessionPayload {
  version: 1;
  sub: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
}

interface LoginAttempt {
  count: number;
  resetsAt: number;
}

@Injectable()
export class AuthService {
  readonly enabled: boolean;
  private readonly production: boolean;
  private readonly email?: string;
  private readonly passwordHash?: string;
  private readonly sessionSecret?: string;
  private readonly sessionTtlSeconds: number;
  private readonly attempts = new Map<string, LoginAttempt>();

  constructor(config: ConfigService) {
    this.production = config.get<string>('NODE_ENV') === 'production';
    this.enabled = this.booleanConfig(
      config.get<string>('AUTH_ENABLED'),
      this.production,
    );
    this.email = config.get<string>('AUTH_EMAIL')?.trim().toLowerCase();
    this.passwordHash = config.get<string>('AUTH_PASSWORD_HASH')?.trim();
    this.sessionSecret = config.get<string>('AUTH_SESSION_SECRET')?.trim();
    this.sessionTtlSeconds =
      this.positiveNumber(config.get<string>('AUTH_SESSION_TTL_HOURS'), 168) *
      60 *
      60;

    if (this.enabled) this.validateConfiguration();
  }

  status(request: Request) {
    const authenticated = !this.enabled || this.isAuthenticated(request);
    return {
      enabled: this.enabled,
      authenticated,
      email: authenticated && this.enabled ? this.email! : null,
    };
  }

  async login(
    email: string,
    password: string,
    request: Request,
    response: Response,
  ) {
    if (!this.enabled) return this.status(request);

    const attemptKey = this.attemptKey(request);
    this.assertNotRateLimited(attemptKey);

    const passwordMatches = await verifyPassword(password, this.passwordHash!);
    const emailMatches = email.trim().toLowerCase() === this.email;
    if (!passwordMatches || !emailMatches) {
      this.recordFailure(attemptKey);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    this.attempts.delete(attemptKey);
    const now = Math.floor(Date.now() / 1000);
    const token = this.sign({
      version: 1,
      sub: LOCAL_USER_ID,
      email: this.email!,
      issuedAt: now,
      expiresAt: now + this.sessionTtlSeconds,
    });
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());

    return { enabled: true, authenticated: true, email: this.email! };
  }

  logout(response: Response) {
    response.clearCookie(SESSION_COOKIE, this.cookieAttributes());
    return { enabled: this.enabled, authenticated: false, email: null };
  }

  isAuthenticated(request: Request): boolean {
    if (!this.enabled) return true;
    const token = this.readCookie(request, SESSION_COOKIE);
    if (!token) return false;

    const [encodedPayload, providedSignature, extra] = token.split('.');
    if (!encodedPayload || !providedSignature || extra) return false;

    const expectedSignature = this.signature(encodedPayload);
    const actual = Buffer.from(providedSignature);
    const expected = Buffer.from(expectedSignature);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return false;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SessionPayload;
      const now = Math.floor(Date.now() / 1000);
      return (
        payload.version === 1 &&
        payload.sub === LOCAL_USER_ID &&
        payload.email === this.email &&
        payload.expiresAt > now
      );
    } catch {
      return false;
    }
  }

  private validateConfiguration(): void {
    if (!this.email || !this.passwordHash || !this.sessionSecret) {
      throw new ServiceUnavailableException(
        'AUTH_EMAIL, AUTH_PASSWORD_HASH e AUTH_SESSION_SECRET são obrigatórios quando AUTH_ENABLED=true.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      throw new ServiceUnavailableException(
        'AUTH_EMAIL não é um e-mail válido.',
      );
    }
    if (!this.passwordHash.startsWith('scrypt$')) {
      throw new ServiceUnavailableException(
        'AUTH_PASSWORD_HASH não possui o formato scrypt esperado.',
      );
    }
    if (this.sessionSecret.length < 32) {
      throw new ServiceUnavailableException(
        'AUTH_SESSION_SECRET deve possuir pelo menos 32 caracteres.',
      );
    }
  }

  private sign(payload: SessionPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    return `${encodedPayload}.${this.signature(encodedPayload)}`;
  }

  private signature(value: string): string {
    return createHmac('sha256', this.sessionSecret!)
      .update(value)
      .digest('base64url');
  }

  private readCookie(request: Request, name: string): string | undefined {
    const cookies = request.headers.cookie?.split(';') ?? [];
    for (const cookie of cookies) {
      const separator = cookie.indexOf('=');
      if (separator < 0) continue;
      if (cookie.slice(0, separator).trim() !== name) continue;
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
    return undefined;
  }

  private cookieOptions() {
    return {
      ...this.cookieAttributes(),
      maxAge: this.sessionTtlSeconds * 1000,
    };
  }

  private cookieAttributes() {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private attemptKey(request: Request): string {
    return request.ip || 'unknown';
  }

  private assertNotRateLimited(key: string): void {
    const attempt = this.attempts.get(key);
    if (!attempt) return;
    if (attempt.resetsAt <= Date.now()) {
      this.attempts.delete(key);
      return;
    }
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string): void {
    if (this.attempts.size > 1_000) {
      const now = Date.now();
      for (const [attemptKey, attempt] of this.attempts) {
        if (attempt.resetsAt <= now) this.attempts.delete(attemptKey);
      }
    }
    const current = this.attempts.get(key);
    if (!current || current.resetsAt <= Date.now()) {
      this.attempts.set(key, {
        count: 1,
        resetsAt: Date.now() + LOGIN_WINDOW_MS,
      });
      return;
    }
    current.count += 1;
  }

  private booleanConfig(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value.trim() === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  private positiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
