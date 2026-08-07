import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService', () => {
  it('does not send a draft week to Google Calendar', async () => {
    const prisma = {
      integrationAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'integration-id',
          status: 'CONNECTED',
          encryptedCredentials: 'encrypted',
        }),
      },
      weeklyPlan: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'plan-id', status: 'DRAFT', blocks: [] }),
      },
    };
    const vault = { configured: () => true, decrypt: jest.fn() };
    const service = new GoogleCalendarService(
      new ConfigService({
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
      }),
      prisma as never,
      vault as never,
      {} as never,
    );

    await expect(service.sync('plan-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(vault.decrypt).not.toHaveBeenCalled();
  });
});
