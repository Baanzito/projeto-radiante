import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
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
          version: '0.1.0',
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

  afterEach(async () => {
    await app.close();
  });
});
