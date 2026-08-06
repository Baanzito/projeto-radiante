import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const plan = {
    id: 'plan-id',
    weekStart: new Date('2026-08-03T00:00:00.000Z'),
    weekEnd: new Date('2026-08-09T00:00:00.000Z'),
    status: 'CONFIRMED',
    weeklyIntent: 'Responder calls sem atraso.',
    rankedTargetMin: 10,
    rankedTargetMax: 14,
    blocks: [
      {
        status: 'COMPLETED',
        plannedStart: new Date('2026-08-03T20:00:00.000Z'),
        plannedEnd: new Date('2026-08-03T22:00:00.000Z'),
      },
    ],
  };
  const prisma = {
    weeklyPlan: { findFirst: jest.fn() },
    trainingSession: { findMany: jest.fn() },
    match: { findMany: jest.fn() },
    coachFeedback: { findMany: jest.fn() },
    trainingCycle: { findFirst: jest.fn() },
    weeklyReview: { findUnique: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.weeklyPlan.findFirst.mockResolvedValue(plan);
    prisma.trainingSession.findMany.mockResolvedValue([
      {
        status: 'COMPLETED',
        startedAt: new Date('2026-08-03T20:00:00.000Z'),
        endedAt: new Date('2026-08-03T21:30:00.000Z'),
        totalPausedSeconds: 600,
      },
    ]);
    prisma.match.findMany.mockResolvedValue([
      {
        queueType: 'COMPETITIVE',
        result: 'WIN',
        rrChange: 18,
        reflection: {
          decisionClarity: 4,
          callResponse: 3,
          patternReading: 5,
          freezesCount: 1,
          taskConflictsCount: 0,
          delayedCallsCount: 2,
          movementErrorsCount: 0,
          ecoPositioningErrorsCount: 0,
          patternsRecognizedCount: 2,
          adaptationsAppliedCount: 1,
        },
      },
    ]);
    prisma.coachFeedback.findMany.mockResolvedValue([]);
    prisma.trainingCycle.findFirst.mockResolvedValue(null);
    prisma.weeklyReview.findUnique.mockResolvedValue(null);
  });

  it('combines planned time, completed time and process evidence', async () => {
    const service = new DashboardService(prisma as unknown as PrismaService);

    await expect(service.summary('2026-08-03')).resolves.toMatchObject({
      adherence: {
        plannedMinutes: 120,
        completedMinutes: 80,
        consciousRankedCount: 1,
      },
      results: { wins: 1, losses: 0, rrDelta: 18 },
      process: {
        sampleSize: 1,
        decisionClarity: 4,
        repeatedPatterns: [
          { label: 'Calls atrasadas', count: 2 },
          { label: 'Travamentos', count: 1 },
        ],
      },
    });
  });
});
