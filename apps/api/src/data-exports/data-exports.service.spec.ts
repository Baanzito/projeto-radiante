import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataExportsService } from './data-exports.service';

describe('DataExportsService', () => {
  const prisma = {
    match: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'match-id',
          startedAt: new Date('2026-08-06T21:00:00.000Z'),
          queueType: 'COMPETITIVE',
          agentName: 'Omen',
          mapName: 'Ascent',
          result: 'WIN',
          allyScore: 13,
          enemyScore: 9,
          rrChange: 18,
          kills: 20,
          deaths: 14,
          assists: 8,
          acs: 242,
          headshotPct: 24.5,
          firstKills: 3,
          firstDeaths: 1,
          notes: '=HYPERLINK("https://example.com"), execução',
        },
      ]),
    },
  };

  it('rejects an incompatible backup before changing the database', async () => {
    const service = new DataExportsService(prisma as unknown as PrismaService);

    await expect(
      service.restore({ format: 'outro-formato' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exports spreadsheet-safe CSV with quoted commas', async () => {
    const service = new DataExportsService(prisma as unknown as PrismaService);

    const csv = await service.csv('matches');

    expect(csv).toContain('match-id');
    expect(csv).toContain("'=HYPERLINK");
  });
});
