import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { FocusAreasService } from '../src/focus-areas/focus-areas.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MatchesService } from '../src/matches/matches.service';
import { TrainingCyclesService } from '../src/training-cycles/training-cycles.service';
import { CoachingService } from '../src/coaching/coaching.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { DataExportsService } from '../src/data-exports/data-exports.service';
import { WeeklyReviewsService } from '../src/weekly-reviews/weekly-reviews.service';

describe('Projeto Radiante foundation (e2e)', () => {
  let app: INestApplication<App>;

  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
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
        trainingCycles: [],
      }),
    },
    integrationAccount: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const focusAreasMock = {
    list: jest.fn().mockResolvedValue([
      {
        id: '30000000-0000-4000-8000-000000000001',
        name: 'Tomada de decisão rápida',
        category: 'DECISION',
        observableBehavior: 'Escolher e executar a prioridade.',
        active: true,
      },
    ]),
    create: jest.fn(),
    update: jest.fn(),
  };

  const trainingCyclesMock = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    complete: jest.fn(),
    reuse: jest.fn().mockResolvedValue({
      id: 'reused-cycle-id',
      name: 'Ciclo reutilizado',
      startDate: '2026-08-20',
      endDate: '2026-09-02',
      durationDays: 14,
      status: 'DRAFT',
      conclusion: null,
      conclusionNotes: null,
      focuses: [],
    }),
  };

  const matchesMock = {
    list: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    get: jest.fn(),
    create: jest.fn().mockImplementation((input) => ({
      id: 'match-id',
      ...input,
      source: 'MANUAL',
      reflection: null,
      reflectionPending: true,
    })),
    update: jest.fn(),
    getReflection: jest.fn(),
    upsertReflection: jest.fn().mockImplementation((matchId, input) => ({
      id: 'reflection-id',
      matchId,
      ...input,
    })),
    pending: jest.fn().mockResolvedValue([]),
    summary: jest.fn().mockResolvedValue({
      totalMatches: 3,
      linkedSessions: 1,
      wins: 2,
      losses: 1,
      draws: 0,
      winRate: 66.7,
      totalRr: 18,
      averageRr: 6,
      averageKills: 18,
      averageDeaths: 15,
      averageAssists: 7,
      kdRatio: 1.2,
      averageAcs: 220,
      averageHeadshotPct: 25,
      averageFirstKills: 2,
      averageFirstDeaths: 1,
      reflectionCount: 2,
      averageDecisionClarity: 4,
      averageCallResponse: 3.5,
      averagePatternReading: 4,
    }),
  };

  const coachingMock = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    addFeedback: jest.fn().mockImplementation((sessionId, input) => ({
      id: 'feedback-id',
      coachSessionId: sessionId,
      status: 'OPEN',
      focusArea: null,
      ...input,
    })),
    updateFeedback: jest.fn(),
    convertToFocus: jest.fn(),
  };
  const dashboardMock = {
    summary: jest.fn().mockResolvedValue({
      week: { planId: null, weekStart: '2026-08-03', weekEnd: '2026-08-09' },
      adherence: { consciousRankedCount: 0 },
      results: { matchCount: 0, wins: 0, losses: 0, rrDelta: 0 },
      process: { sampleSize: 0, repeatedPatterns: [] },
      coaching: { openFeedbackCount: 0, highPriorityCount: 0 },
      cycle: null,
      review: null,
    }),
  };
  const weeklyReviewsMock = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    generate: jest.fn(),
    update: jest.fn(),
    apply: jest.fn(),
  };
  const exportsMock = {
    backup: jest.fn(),
    csv: jest.fn().mockResolvedValue('id,result\nmatch-id,WIN'),
    restore: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(FocusAreasService)
      .useValue(focusAreasMock)
      .overrideProvider(TrainingCyclesService)
      .useValue(trainingCyclesMock)
      .overrideProvider(MatchesService)
      .useValue(matchesMock)
      .overrideProvider(CoachingService)
      .useValue(coachingMock)
      .overrideProvider(DashboardService)
      .useValue(dashboardMock)
      .overrideProvider(WeeklyReviewsService)
      .useValue(weeklyReviewsMock)
      .overrideProvider(DataExportsService)
      .useValue(exportsMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  it('GET /api/v1/health reports the local foundation', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          services: { api: 'up', database: 'up' },
          version: '0.6.0',
        });
      });
  });

  it('GET /api/v1/profile returns the seeded local profile', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/profile')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          displayName: 'Diego',
          currentRank: 'Ascendente 2',
          sensitivity: 0.179,
          dpi: 3200,
        });
      });
  });

  it('GET /api/v1/integrations/status keeps optional providers disabled safely', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/integrations/status')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          openai: { configured: false, writesRequireConfirmation: true },
          googleCalendar: {
            configured: false,
            connected: false,
            direction: 'OUTBOUND_ONLY',
          },
          mcp: { enabled: true, mode: 'READ_ONLY' },
        });
      });
  });

  it('GET /api/v1/focus-areas exposes the focus library', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/focus-areas?includeInactive=true')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'Tomada de decisão rápida',
              category: 'DECISION',
            }),
          ]),
        );
      });
  });

  it('POST /api/v1/training-cycles validates the cycle focus invariant at the boundary', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/training-cycles')
      .send({
        name: 'Ciclo inválido',
        startDate: '2026-08-06',
        durationDays: 14,
        focuses: [],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          type: 'about:blank',
          title: 'Requisição inválida',
          status: 400,
          instance: '/api/v1/training-cycles',
        });
      });
    expect(trainingCyclesMock.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/training-cycles/:id/reuse creates a new draft contract', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/training-cycles/old-cycle-id/reuse')
      .send({ name: 'Ciclo reutilizado', startDate: '2026-08-20' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'reused-cycle-id',
          status: 'DRAFT',
          durationDays: 14,
        });
      });
    expect(trainingCyclesMock.reuse).toHaveBeenCalledWith('old-cycle-id', {
      name: 'Ciclo reutilizado',
      startDate: '2026-08-20',
    });
  });

  it('POST /api/v1/matches accepts the essential manual match fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/matches')
      .send({
        sessionId: '11111111-1111-4111-8111-111111111112',
        startedAt: '2026-08-06T21:00:00.000Z',
        queueType: 'COMPETITIVE',
        agentName: 'Omen',
        mapName: 'Ascent',
        result: 'WIN',
        allyScore: 13,
        enemyScore: 9,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'match-id',
          source: 'MANUAL',
          reflectionPending: true,
        });
      });
  });

  it('GET /api/v1/matches/summary exposes tracker aggregates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/matches/summary')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          totalMatches: 3,
          wins: 2,
          winRate: 66.7,
          averageAcs: 220,
          reflectionCount: 2,
        });
      });
  });

  it('PUT /api/v1/matches/:id/reflection rejects scales outside 1–5', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/matches/match-id/reflection')
      .send({
        decisionClarity: 6,
        callResponse: 3,
        patternReading: 4,
        freezesCount: 0,
        taskConflictsCount: 0,
      })
      .expect(400);
    expect(matchesMock.upsertReflection).not.toHaveBeenCalled();
  });

  it('POST /api/v1/coach-sessions/:id/feedbacks accepts actionable coaching feedback', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/coach-sessions/session-id/feedbacks')
      .send({
        category: 'DECISION',
        priority: 'HIGH',
        feedbackText: 'Definir a intenção antes de usar utilitário.',
        suggestedAction: 'Verbalizar a intenção antes do execute.',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: 'feedback-id', status: 'OPEN' });
      });
  });

  it('GET /api/v1/dashboard/summary exposes the weekly process contract', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          adherence: { consciousRankedCount: 0 },
          process: { sampleSize: 0, repeatedPatterns: [] },
        });
      });
  });

  it('GET /api/v1/exports/csv/:dataset rejects an unsupported dataset', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/exports/csv/unknown')
      .expect(400);
    expect(exportsMock.csv).not.toHaveBeenCalledWith('unknown');
  });

  afterEach(async () => {
    await app.close();
  });
});
