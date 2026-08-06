import { PrismaService } from '../prisma/prisma.service';
import { WeeklyPlansService } from './weekly-plans.service';

describe('WeeklyPlansService editing confirmed weeks', () => {
  const block = {
    id: 'block-id',
    weeklyPlanId: 'plan-id',
    type: 'RANKED',
    status: 'CONFIRMED',
    title: 'Ranked consciente',
    plannedStart: new Date('2026-08-03T23:15:00.000Z'),
    plannedEnd: new Date('2026-08-04T01:15:00.000Z'),
    focusAreaId: null,
    focusArea: null,
    notes: null,
    cancellationReason: null,
    session: null,
  };
  const plan = {
    id: 'plan-id',
    weekStart: new Date('2026-08-03T00:00:00.000Z'),
    weekEnd: new Date('2026-08-09T00:00:00.000Z'),
    status: 'CONFIRMED',
    rankedTargetMin: 10,
    rankedTargetMax: 14,
    weeklyIntent: 'Clareza nas decisões.',
    blocks: [block],
  };

  it('moves a confirmed week and all planned blocks by the same number of days', async () => {
    const shiftedBlock = {
      ...block,
      plannedStart: new Date('2026-08-10T23:15:00.000Z'),
      plannedEnd: new Date('2026-08-11T01:15:00.000Z'),
    };
    const tx = {
      routineBlock: { update: jest.fn().mockResolvedValue(shiftedBlock) },
      weeklyPlan: {
        update: jest.fn().mockResolvedValue({
          ...plan,
          weekStart: new Date('2026-08-10T00:00:00.000Z'),
          weekEnd: new Date('2026-08-16T00:00:00.000Z'),
          blocks: [shiftedBlock],
        }),
      },
    };
    const service = new WeeklyPlansService({
      weeklyPlan: { findFirst: jest.fn().mockResolvedValue(plan) },
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService);

    await expect(
      service.update('plan-id', { weekStart: '2026-08-10' }),
    ).resolves.toMatchObject({
      weekStart: '2026-08-10',
      weekEnd: '2026-08-16',
      status: 'CONFIRMED',
    });
    expect(tx.routineBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-id' },
      data: {
        plannedStart: new Date('2026-08-10T23:15:00.000Z'),
        plannedEnd: new Date('2026-08-11T01:15:00.000Z'),
      },
    });
  });

  it('allows deleting an unused block from a confirmed week', async () => {
    const remove = jest.fn().mockResolvedValue(block);
    const service = new WeeklyPlansService({
      routineBlock: {
        findFirst: jest.fn().mockResolvedValue(block),
        delete: remove,
      },
      weeklyPlan: { findFirst: jest.fn().mockResolvedValue(plan) },
    } as unknown as PrismaService);

    await expect(service.deleteBlock('block-id')).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith({ where: { id: 'block-id' } });
  });
});
