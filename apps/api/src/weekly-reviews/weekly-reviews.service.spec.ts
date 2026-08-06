import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { WeeklyReviewsService } from './weekly-reviews.service';

describe('WeeklyReviewsService', () => {
  const review = {
    id: 'review-id',
    status: 'REVIEWED',
    selfConclusion: 'Mantive mais clareza nas decisões.',
    repeatedPatterns: ['Calls atrasadas'],
    nextWeekProposal: { text: 'Treinar respostas curtas.' },
    weeklyPlan: {
      weekStart: new Date('2026-08-03T00:00:00.000Z'),
      weekEnd: new Date('2026-08-09T00:00:00.000Z'),
      status: 'CLOSED',
      weeklyIntent: 'Responder calls sem atraso.',
      rankedTargetMin: 10,
      rankedTargetMax: 14,
    },
  };
  const prisma = {
    weeklyReview: { findFirst: jest.fn(), update: jest.fn() },
  };
  const dashboard = { summary: jest.fn() };
  let service: WeeklyReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WeeklyReviewsService(
      prisma as unknown as PrismaService,
      dashboard as unknown as DashboardService,
    );
    prisma.weeklyReview.findFirst.mockResolvedValue(review);
    prisma.weeklyReview.update.mockResolvedValue({
      ...review,
      status: 'APPLIED',
    });
  });

  it('applies a reviewed weekly conclusion and maps its proposal', async () => {
    await expect(service.apply('review-id')).resolves.toMatchObject({
      status: 'APPLIED',
      nextWeekProposal: 'Treinar respostas curtas.',
      weeklyPlan: { weekStart: '2026-08-03', weekEnd: '2026-08-09' },
    });
  });

  it('rejects applying a generated review without the personal conclusion', async () => {
    prisma.weeklyReview.findFirst.mockResolvedValue({
      ...review,
      status: 'GENERATED',
      selfConclusion: null,
    });

    await expect(service.apply('review-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.weeklyReview.update).not.toHaveBeenCalled();
  });
});
