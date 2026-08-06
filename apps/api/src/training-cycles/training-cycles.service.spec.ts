import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingCyclesService } from './training-cycles.service';

describe('TrainingCyclesService', () => {
  const focusArea = {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Tomada de decisão rápida',
    active: true,
  };

  const cycle = {
    id: 'cycle-id',
    userId: '11111111-1111-4111-8111-111111111111',
    name: 'Ciclo de decisão',
    startDate: new Date('2026-08-06T00:00:00.000Z'),
    endDate: new Date('2026-08-19T00:00:00.000Z'),
    status: 'DRAFT',
    conclusion: null,
    conclusionNotes: null,
    focuses: [
      {
        focusAreaId: focusArea.id,
        priority: 'PRIMARY',
        successCriteria: 'Reduzir travamentos.',
        focusArea,
      },
    ],
  };

  it('requires exactly one primary focus', async () => {
    const service = new TrainingCyclesService({} as PrismaService);

    await expect(
      service.create({
        name: 'Inválido',
        startDate: '2026-08-06',
        durationDays: 14,
        focuses: [
          {
            focusAreaId: focusArea.id,
            priority: 'SECONDARY',
            successCriteria: 'Melhorar.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a 14-day draft with an inclusive end date', async () => {
    const create = jest.fn().mockImplementation((value: unknown) => {
      const { data } = value as {
        data: { name: string; startDate: Date; endDate: Date };
      };
      return {
        ...cycle,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      };
    });
    const service = new TrainingCyclesService({
      focusArea: { count: jest.fn().mockResolvedValue(1) },
      trainingCycle: { create },
    } as unknown as PrismaService);

    await expect(
      service.create({
        name: 'Ciclo de decisão',
        startDate: '2026-08-06',
        durationDays: 14,
        focuses: [
          {
            focusAreaId: focusArea.id,
            priority: 'PRIMARY',
            successCriteria: 'Reduzir travamentos.',
          },
        ],
      }),
    ).resolves.toMatchObject({
      startDate: '2026-08-06',
      endDate: '2026-08-19',
      durationDays: 14,
    });
  });

  it('requires explicit replacement when another cycle is active', async () => {
    const tx = {
      trainingCycle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(cycle)
          .mockResolvedValueOnce({ id: 'active-id', name: 'Atual' }),
      },
    };
    const service = new TrainingCyclesService({
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService);

    await expect(service.activate(cycle.id, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('cancels the current cycle before an explicit replacement', async () => {
    const activated = { ...cycle, status: 'ACTIVE' };
    const update = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(activated);
    const tx = {
      trainingCycle: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(cycle)
          .mockResolvedValueOnce({ id: 'active-id', name: 'Atual' }),
        update,
      },
    };
    const service = new TrainingCyclesService({
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService);

    await expect(
      service.activate(cycle.id, { replaceActive: true }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    );
  });

  it('requires a conclusion when completing the active cycle', async () => {
    const active = { ...cycle, status: 'ACTIVE' };
    const update = jest.fn().mockResolvedValue({
      ...active,
      status: 'COMPLETED',
      conclusion: 'IMPROVED',
    });
    const service = new TrainingCyclesService({
      trainingCycle: {
        findFirst: jest.fn().mockResolvedValue(active),
        update,
      },
    } as unknown as PrismaService);

    await expect(
      service.complete(cycle.id, { conclusion: 'IMPROVED' }),
    ).resolves.toMatchObject({ status: 'COMPLETED', conclusion: 'IMPROVED' });
  });
});
