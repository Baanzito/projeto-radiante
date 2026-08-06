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
            peakRank: null,
            valorantName: 'Baanzito',
            valorantTag: 'BR1',
            sensitivity: '0.179',
            dpi: 3200,
            weeklyRankedMin: 10,
            weeklyRankedMax: 14,
            primaryGoal: 'Atingir Radiant.',
            defaultSessionStart: new Date('1970-01-01T20:15:00.000Z'),
            defaultSessionEnd: new Date('1970-01-01T22:45:00.000Z'),
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
      peakRank: null,
      valorantName: 'Baanzito',
      valorantTag: 'BR1',
      sensitivity: 0.179,
      dpi: 3200,
      weeklyRankedMin: 10,
      weeklyRankedMax: 14,
      primaryGoal: 'Atingir Radiant.',
      defaultSessionStart: '20:15',
      defaultSessionEnd: '22:45',
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

  it('rejects an inverted weekly ranked range', async () => {
    const service = new ProfileService({} as PrismaService);

    await expect(
      service.updateLocalProfile({
        displayName: 'Diego',
        timezone: 'America/Sao_Paulo',
        currentRank: 'Ascendente 2',
        currentRr: null,
        peakRank: null,
        valorantName: null,
        valorantTag: null,
        sensitivity: 0.179,
        dpi: 3200,
        weeklyRankedMin: 15,
        weeklyRankedMax: 10,
        primaryGoal: 'Radiant',
        defaultSessionStart: '20:15',
        defaultSessionEnd: '22:45',
      }),
    ).rejects.toThrow('A meta máxima de rankeds');
  });
});
