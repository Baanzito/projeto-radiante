import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  it('maps the seeded user to the public profile response', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          displayName: 'Diego',
          timezone: 'America/Sao_Paulo',
          profile: {
            currentRank: 'Ascendente 2',
            currentRr: null,
            sensitivity: '0.179',
            dpi: 3200,
            weeklyRankedMin: 10,
            weeklyRankedMax: 14,
            primaryGoal: 'Atingir Radiant.',
          },
          trainingCycles: [
            {
              id: 'cycle-id',
              name: 'Ciclo inicial',
              startDate: new Date('2026-08-06T00:00:00.000Z'),
              endDate: new Date('2026-08-19T00:00:00.000Z'),
              focuses: [
                {
                  priority: 'PRIMARY',
                  successCriteria: 'Reduzir travamentos.',
                  focusArea: { name: 'Tomada de decisão rápida' },
                },
              ],
            },
          ],
        }),
      },
    } as unknown as PrismaService;
    const service = new ProfileService(prisma);

    await expect(service.getLocalProfile()).resolves.toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'Diego',
      timezone: 'America/Sao_Paulo',
      currentRank: 'Ascendente 2',
      currentRr: null,
      sensitivity: 0.179,
      dpi: 3200,
      weeklyRankedMin: 10,
      weeklyRankedMax: 14,
      primaryGoal: 'Atingir Radiant.',
      activeCycle: {
        id: 'cycle-id',
        name: 'Ciclo inicial',
        startDate: '2026-08-06',
        endDate: '2026-08-19',
        focuses: [
          {
            name: 'Tomada de decisão rápida',
            priority: 'PRIMARY',
            successCriteria: 'Reduzir travamentos.',
          },
        ],
      },
    });
  });

  it('requires the local seed before serving the profile', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new ProfileService(prisma);

    await expect(service.getLocalProfile()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
