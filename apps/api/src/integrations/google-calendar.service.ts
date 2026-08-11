import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { google, type calendar_v3 } from 'googleapis';
import { AuditService } from '../audit/audit.service';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialVaultService } from './credential-vault.service';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

interface StoredGoogleCredential {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}

@Injectable()
export class GoogleCalendarService {
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly redirectUri: string;
  private readonly webOrigin: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly vault: CredentialVaultService,
    private readonly audit: AuditService,
  ) {
    this.clientId = config.get<string>('GOOGLE_CLIENT_ID')?.trim() || undefined;
    this.clientSecret =
      config.get<string>('GOOGLE_CLIENT_SECRET')?.trim() || undefined;
    this.redirectUri = config.get<string>(
      'GOOGLE_REDIRECT_URI',
      'http://127.0.0.1:3000/api/v1/integrations/google-calendar/callback',
    );
    this.webOrigin = config.get<string>(
      'APP_ORIGIN',
      config.get<string>('WEB_ORIGIN', 'http://localhost:4200'),
    );
  }

  async status() {
    const account = await this.prisma.integrationAccount.findUnique({
      where: {
        userId_provider: { userId: LOCAL_USER_ID, provider: 'GOOGLE_CALENDAR' },
      },
      select: {
        status: true,
        scopes: true,
        accountLabel: true,
        updatedAt: true,
        calendarEventSyncs: {
          select: { status: true, lastSyncedAt: true },
          orderBy: { lastSyncedAt: 'desc' },
          take: 1,
        },
      },
    });
    return {
      configured: this.providerConfigured(),
      connected: account?.status === 'CONNECTED',
      status: account?.status ?? 'DISCONNECTED',
      accountLabel: account?.accountLabel ?? null,
      scopes: account?.scopes ?? [],
      lastSyncedAt: account?.calendarEventSyncs[0]?.lastSyncedAt ?? null,
      direction: 'OUTBOUND_ONLY' as const,
    };
  }

  async authorizationUrl() {
    this.assertConfigured();
    const state = randomBytes(32).toString('base64url');
    const stateHash = this.hash(state);
    await this.prisma.integrationOAuthState.create({
      data: {
        userId: LOCAL_USER_ID,
        provider: 'GOOGLE_CALENDAR',
        stateHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const client = this.oauthClient();
    return {
      authorizationUrl: client.generateAuthUrl({
        access_type: 'offline',
        include_granted_scopes: true,
        prompt: 'consent',
        scope: [CALENDAR_SCOPE],
        state,
      }),
      expiresInSeconds: 600,
    };
  }

  async callback(code: string, state: string) {
    this.assertConfigured();
    if (!code?.trim() || !state?.trim()) {
      throw new BadRequestException('Código ou estado OAuth ausente.');
    }
    const oauthState = await this.prisma.integrationOAuthState.findUnique({
      where: { stateHash: this.hash(state) },
    });
    if (
      !oauthState ||
      oauthState.userId !== LOCAL_USER_ID ||
      oauthState.provider !== 'GOOGLE_CALENDAR' ||
      oauthState.consumedAt ||
      oauthState.expiresAt < new Date()
    ) {
      throw new BadRequestException('Estado OAuth inválido ou expirado.');
    }
    await this.prisma.integrationOAuthState.update({
      where: { id: oauthState.id },
      data: { consumedAt: new Date() },
    });
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);
    const existing = await this.prisma.integrationAccount.findUnique({
      where: {
        userId_provider: { userId: LOCAL_USER_ID, provider: 'GOOGLE_CALENDAR' },
      },
    });
    const previous = existing
      ? this.vault.decrypt<StoredGoogleCredential>(
          existing.encryptedCredentials,
        )
      : null;
    const refreshToken = tokens.refresh_token ?? previous?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        'O Google não retornou um refresh token. Revogue o acesso anterior e conecte novamente.',
      );
    }
    const credential: StoredGoogleCredential = {
      refreshToken,
      accessToken: tokens.access_token ?? undefined,
      expiryDate: tokens.expiry_date ?? undefined,
    };
    const scopes = (tokens.scope ?? CALENDAR_SCOPE).split(' ').filter(Boolean);
    const account = await this.prisma.integrationAccount.upsert({
      where: {
        userId_provider: { userId: LOCAL_USER_ID, provider: 'GOOGLE_CALENDAR' },
      },
      create: {
        userId: LOCAL_USER_ID,
        provider: 'GOOGLE_CALENDAR',
        status: 'CONNECTED',
        scopes,
        encryptedCredentials: this.vault.encrypt(credential),
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
      update: {
        status: 'CONNECTED',
        scopes,
        encryptedCredentials: this.vault.encrypt(credential),
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });
    await this.audit.record({
      actor: 'USER',
      action: 'GOOGLE_CALENDAR_CONNECTED',
      entityType: 'IntegrationAccount',
      entityId: account.id,
      summary: 'Google Calendar conectado com permissão mínima de eventos.',
      metadata: { scopes },
    });
    return `${this.webOrigin}/?integration=google-calendar-connected`;
  }

  async disconnect() {
    const account = await this.account();
    try {
      const credential = this.vault.decrypt<StoredGoogleCredential>(
        account.encryptedCredentials,
      );
      const client = this.oauthClient();
      client.setCredentials({ refresh_token: credential.refreshToken });
      await client.revokeToken(credential.refreshToken);
    } catch {
      // A revogação remota é best effort; o segredo local será removido de qualquer forma.
    }
    await this.prisma.integrationAccount.delete({ where: { id: account.id } });
    await this.audit.record({
      actor: 'USER',
      action: 'GOOGLE_CALENDAR_DISCONNECTED',
      entityType: 'IntegrationAccount',
      entityId: account.id,
      summary: 'Google Calendar desconectado e credencial local removida.',
    });
    return { disconnected: true };
  }

  async sync(weeklyPlanId: string) {
    const account = await this.account();
    if (account.status !== 'CONNECTED') {
      throw new ConflictException('Conecte novamente o Google Calendar.');
    }
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: weeklyPlanId, userId: LOCAL_USER_ID },
      include: { blocks: { orderBy: { plannedStart: 'asc' } } },
    });
    if (!plan)
      throw new NotFoundException('Planejamento semanal não encontrado.');
    if (!['CONFIRMED', 'CLOSED'].includes(plan.status)) {
      throw new ConflictException('Confirme a semana antes de sincronizar.');
    }
    const profile = await this.prisma.user.findUnique({
      where: { id: LOCAL_USER_ID },
    });
    const credential = this.vault.decrypt<StoredGoogleCredential>(
      account.encryptedCredentials,
    );
    const client = this.oauthClient();
    client.setCredentials({
      refresh_token: credential.refreshToken,
      access_token: credential.accessToken,
      expiry_date: credential.expiryDate,
    });
    const calendar = google.calendar({ version: 'v3', auth: client });
    const result = {
      created: 0,
      updated: 0,
      cancelled: 0,
      unchanged: 0,
      errors: [] as string[],
    };

    for (const block of plan.blocks) {
      try {
        await this.syncBlock(
          calendar,
          account.id,
          block,
          profile?.timezone ?? 'America/Sao_Paulo',
          result,
        );
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message.slice(0, 300)
            : 'Falha desconhecida';
        result.errors.push(`${block.title}: ${detail}`);
        await this.saveSyncFailure(
          account.id,
          block.id,
          this.eventId(block.id),
          detail,
        );
      }
    }
    await this.audit.record({
      actor: 'USER',
      action: 'GOOGLE_CALENDAR_SYNCED',
      entityType: 'WeeklyPlan',
      entityId: plan.id,
      summary: 'Sincronização unidirecional da semana concluída.',
      metadata: result,
    });
    return result;
  }

  private async syncBlock(
    calendar: calendar_v3.Calendar,
    integrationAccountId: string,
    block: {
      id: string;
      title: string;
      type: string;
      status: string;
      plannedStart: Date;
      plannedEnd: Date;
      notes: string | null;
    },
    timezone: string,
    result: {
      created: number;
      updated: number;
      cancelled: number;
      unchanged: number;
    },
  ) {
    const mapping = await this.prisma.calendarEventSync.findUnique({
      where: { routineBlockId: block.id },
    });
    const externalEventId = mapping?.externalEventId ?? this.eventId(block.id);
    if (block.status === 'CANCELLED') {
      if (mapping?.status === 'CANCELLED') {
        result.unchanged++;
        return;
      }
      let existed = true;
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: externalEventId,
        });
      } catch (error) {
        if (!this.isGoogleStatus(error, 404)) throw error;
        existed = false;
      }
      await this.prisma.calendarEventSync.upsert({
        where: { routineBlockId: block.id },
        create: {
          userId: LOCAL_USER_ID,
          integrationAccountId,
          routineBlockId: block.id,
          externalEventId,
          payloadHash: this.hash('cancelled'),
          status: 'CANCELLED',
        },
        update: {
          status: 'CANCELLED',
          lastError: null,
          lastSyncedAt: new Date(),
        },
      });
      if (existed) result.cancelled++;
      else result.unchanged++;
      return;
    }
    const event: calendar_v3.Schema$Event = {
      id: externalEventId,
      summary: `[Projeto Radiante] ${block.title}`,
      description: [
        `Tipo: ${block.type}`,
        block.notes ? `Observações: ${block.notes}` : null,
        'Sincronização unidirecional: edite o bloco no Projeto Radiante.',
      ]
        .filter(Boolean)
        .join('\n'),
      start: { dateTime: block.plannedStart.toISOString(), timeZone: timezone },
      end: { dateTime: block.plannedEnd.toISOString(), timeZone: timezone },
      extendedProperties: { private: { projetoRadianteBlockId: block.id } },
    };
    const payloadHash = this.hash(JSON.stringify(event));
    if (mapping?.status === 'SYNCED' && mapping.payloadHash === payloadHash) {
      result.unchanged++;
      return;
    }
    let response;
    if (mapping) {
      try {
        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: externalEventId,
          requestBody: event,
        });
        result.updated++;
      } catch (error) {
        if (!this.isGoogleStatus(error, 404)) throw error;
        try {
          response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });
          result.created++;
        } catch (insertError) {
          if (!this.isGoogleStatus(insertError, 409)) throw insertError;
          response = await calendar.events.update({
            calendarId: 'primary',
            eventId: externalEventId,
            requestBody: event,
          });
          result.updated++;
        }
      }
    } else {
      try {
        response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        result.created++;
      } catch (error) {
        if (!this.isGoogleStatus(error, 409)) throw error;
        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: externalEventId,
          requestBody: event,
        });
        result.updated++;
      }
    }
    await this.prisma.calendarEventSync.upsert({
      where: { routineBlockId: block.id },
      create: {
        userId: LOCAL_USER_ID,
        integrationAccountId,
        routineBlockId: block.id,
        externalEventId,
        payloadHash,
        htmlLink: response.data.htmlLink ?? null,
      },
      update: {
        integrationAccountId,
        status: 'SYNCED',
        payloadHash,
        htmlLink: response.data.htmlLink ?? null,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });
  }

  private async saveSyncFailure(
    accountId: string,
    blockId: string,
    eventId: string,
    detail: string,
  ) {
    await this.prisma.calendarEventSync.upsert({
      where: { routineBlockId: blockId },
      create: {
        userId: LOCAL_USER_ID,
        integrationAccountId: accountId,
        routineBlockId: blockId,
        externalEventId: eventId,
        payloadHash: this.hash('error'),
        status: 'ERROR',
        lastError: detail,
      },
      update: { status: 'ERROR', lastError: detail, lastSyncedAt: new Date() },
    });
  }

  private async account() {
    const account = await this.prisma.integrationAccount.findUnique({
      where: {
        userId_provider: { userId: LOCAL_USER_ID, provider: 'GOOGLE_CALENDAR' },
      },
    });
    if (!account)
      throw new NotFoundException('Google Calendar ainda não está conectado.');
    return account;
  }

  private providerConfigured() {
    return Boolean(
      this.clientId && this.clientSecret && this.vault.configured(),
    );
  }

  private assertConfigured() {
    if (!this.providerConfigured()) {
      throw new ServiceUnavailableException(
        'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e INTEGRATION_ENCRYPTION_KEY no backend.',
      );
    }
  }

  private oauthClient() {
    this.assertConfigured();
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private eventId(blockId: string) {
    return `pr${blockId.replaceAll('-', '').toLowerCase()}`;
  }

  private isGoogleStatus(error: unknown, status: number) {
    const candidate = error as {
      code?: number;
      response?: { status?: number };
    };
    return candidate.code === status || candidate.response?.status === status;
  }
}
