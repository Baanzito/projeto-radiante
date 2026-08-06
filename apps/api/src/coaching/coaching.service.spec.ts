import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoachingService } from './coaching.service';

describe('CoachingService', () => {
  const prisma = {
    coachSession: { findFirst: jest.fn() },
    coachFeedback: { findFirst: jest.fn(), update: jest.fn() },
    focusArea: { findFirst: jest.fn() },
  };
  let service: CoachingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoachingService(prisma as unknown as PrismaService);
  });

  it('connects an open feedback to an existing active focus', async () => {
    prisma.coachFeedback.findFirst.mockResolvedValue({
      id: 'feedback-id',
      focusAreaId: null,
      category: 'DECISION',
    });
    prisma.focusArea.findFirst.mockResolvedValue({
      id: 'focus-id',
      active: true,
    });
    prisma.coachFeedback.update.mockResolvedValue({
      id: 'feedback-id',
      focusAreaId: 'focus-id',
      status: 'IN_PROGRESS',
    });

    await expect(
      service.convertToFocus('feedback-id', { focusAreaId: 'focus-id' }),
    ).resolves.toMatchObject({
      focusAreaId: 'focus-id',
      status: 'IN_PROGRESS',
    });
    expect(prisma.coachFeedback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'feedback-id' },
        data: { focusAreaId: 'focus-id', status: 'IN_PROGRESS' },
      }),
    );
  });

  it('does not convert a feedback that already has a focus', async () => {
    prisma.coachFeedback.findFirst.mockResolvedValue({
      id: 'feedback-id',
      focusAreaId: 'existing-focus-id',
    });

    await expect(
      service.convertToFocus('feedback-id', { focusAreaId: 'other-focus-id' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.coachFeedback.update).not.toHaveBeenCalled();
  });
});
