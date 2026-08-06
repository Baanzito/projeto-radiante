import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const baseMatch = {
    id: 'match-id',
    userId,
    sessionId: 'session-id',
    source: 'MANUAL',
    riotMatchId: null,
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
    headshotPct: { toString: () => '24.50' },
    firstKills: 3,
    firstDeaths: 1,
    notes: null,
    reflection: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    trainingSession: { findFirst: jest.fn() },
    match: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    matchReflection: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  let service: MatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchesService(prisma as unknown as PrismaService);
    prisma.trainingSession.findFirst.mockResolvedValue({
      status: 'IN_PROGRESS',
    });
    prisma.match.create.mockResolvedValue(baseMatch);
    prisma.match.findFirst.mockResolvedValue(baseMatch);
  });

  it('creates a manual match attached to an open session', async () => {
    const result = await service.create({
      sessionId: 'session-id',
      startedAt: '2026-08-06T21:00:00.000Z',
      queueType: 'COMPETITIVE',
      agentName: ' Omen ',
      mapName: ' Ascent ',
      result: 'WIN',
      allyScore: 13,
      enemyScore: 9,
      kills: 20,
    });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          source: 'MANUAL',
          agentName: 'Omen',
          mapName: 'Ascent',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 'match-id',
      startedAt: '2026-08-06T21:00:00.000Z',
      headshotPct: 24.5,
      reflectionPending: true,
    });
  });

  it('rejects attaching a new match to an ended session', async () => {
    prisma.trainingSession.findFirst.mockResolvedValue({ status: 'COMPLETED' });

    await expect(
      service.create({
        sessionId: 'session-id',
        startedAt: '2026-08-06T21:00:00.000Z',
        queueType: 'COMPETITIVE',
        agentName: 'Omen',
        mapName: 'Ascent',
        result: 'LOSS',
        allyScore: 10,
        enemyScore: 13,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.match.create).not.toHaveBeenCalled();
  });

  it('upserts a reflection without duplicating it', async () => {
    prisma.matchReflection.upsert.mockResolvedValue({ id: 'reflection-id' });
    await service.upsertReflection('match-id', {
      decisionClarity: 4,
      callResponse: 3,
      patternReading: 5,
      freezesCount: 1,
      taskConflictsCount: 0,
      delayedCallsCount: 0,
      communicatedIntentionsCount: 2,
      movementErrorsCount: 0,
      ecoPositioningErrorsCount: 0,
      unnecessaryCrosshairMovesCount: 0,
      patternsRecognizedCount: 2,
      adaptationsAppliedCount: 1,
      goodDecision: 'Rotacionei depois de confirmar o padrão.',
      nextCorrection: null,
    });

    expect(prisma.matchReflection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId: 'match-id' },
        create: expect.objectContaining({ matchId: 'match-id', userId }),
        update: expect.objectContaining({ decisionClarity: 4 }),
      }),
    );
  });

  it('lists matches without reflection as pending', async () => {
    prisma.match.findMany.mockResolvedValue([baseMatch]);

    const result = await service.pending();

    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, reflection: null },
        take: 100,
      }),
    );
    expect(result[0]).toMatchObject({
      id: 'match-id',
      reflectionPending: true,
    });
  });
});
