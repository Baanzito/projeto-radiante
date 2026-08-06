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
          version: '0.4.0',
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

  afterEach(async () => {
    await app.close();
  });
});
