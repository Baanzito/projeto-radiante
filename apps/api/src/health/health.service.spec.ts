import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports the API and database as available', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.2.0',
    });
  });

  it('returns service unavailable when the database cannot be reached', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
