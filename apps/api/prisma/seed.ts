import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  FocusCategory,
  FocusPriority,
  PrismaClient,
  TrainingCycleStatus,
} from '../src/generated/prisma/client';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CYCLE_ID = '22222222-2222-4222-8222-222222222222';

const focusAreas = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    name: 'Tomada de decisão rápida',
    category: FocusCategory.DECISION,
    observableBehavior:
      'Escolher e executar a prioridade do round sem travar diante de tarefas concorrentes.',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    name: 'Resposta às calls',
    category: FocusCategory.COMMUNICATION,
    observableBehavior:
      'Processar e executar calls do time sem atraso, comunicando impedimentos imediatamente.',
  },
  {
    id: '30000000-0000-4000-8000-000000000003',
    name: 'Leitura de padrões',
    category: FocusCategory.AWARENESS,
    observableBehavior:
      'Reconhecer padrões adversários round a round e aplicar uma adaptação verificável.',
  },
  {
    id: '30000000-0000-4000-8000-000000000004',
    name: 'Organização do pensamento',
    category: FocusCategory.DECISION,
    observableBehavior:
      'Ordenar responsabilidades antes da execução quando houver múltiplas tarefas possíveis.',
  },
  {
    id: '30000000-0000-4000-8000-000000000005',
    name: 'Comunicação de intenção',
    category: FocusCategory.COMMUNICATION,
    observableBehavior:
      'Informar ao time a ação pretendida antes de executá-la quando houver dependência coletiva.',
  },
  {
    id: '30000000-0000-4000-8000-000000000006',
    name: 'Movimentação',
    category: FocusCategory.MOVEMENT,
    observableBehavior:
      'Evitar exposição desnecessária e sincronizar parada, mira e disparo.',
  },
  {
    id: '30000000-0000-4000-8000-000000000007',
    name: 'Atenção',
    category: FocusCategory.AWARENESS,
    observableBehavior:
      'Manter consciência das informações relevantes sem concentrar toda a atenção na mira.',
  },
  {
    id: '30000000-0000-4000-8000-000000000008',
    name: 'Posicionamento em ECO',
    category: FocusCategory.POSITIONING,
    observableBehavior:
      'Escolher posições que maximizem troca, surpresa e recuperação de arma em rounds ECO.',
  },
  {
    id: '30000000-0000-4000-8000-000000000009',
    name: 'Estabilidade da mira',
    category: FocusCategory.AIM,
    observableBehavior:
      'Reduzir movimentos desnecessários do crosshair e manter pre-aim disciplinado.',
  },
] as const;

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não foi definida.');
  }

  return databaseUrl;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: {
        displayName: 'Diego',
        timezone: 'America/Sao_Paulo',
      },
      create: {
        id: USER_ID,
        displayName: 'Diego',
        timezone: 'America/Sao_Paulo',
      },
    });

    await prisma.playerProfile.upsert({
      where: { userId: USER_ID },
      update: {
        currentRank: 'Ascendente 2',
        sensitivity: '0.179',
        dpi: 3200,
        primaryGoal:
          'Atingir Radiant e criar condições reais para competir profissionalmente.',
        weeklyRankedMin: 10,
        weeklyRankedMax: 14,
      },
      create: {
        userId: USER_ID,
        currentRank: 'Ascendente 2',
        sensitivity: '0.179',
        dpi: 3200,
        primaryGoal:
          'Atingir Radiant e criar condições reais para competir profissionalmente.',
        weeklyRankedMin: 10,
        weeklyRankedMax: 14,
      },
    });

    for (const focusArea of focusAreas) {
      await prisma.focusArea.upsert({
        where: { id: focusArea.id },
        update: {
          name: focusArea.name,
          category: focusArea.category,
          observableBehavior: focusArea.observableBehavior,
          active: true,
        },
        create: {
          ...focusArea,
          userId: USER_ID,
        },
      });
    }

    const cycleStart = new Date('2026-08-06T00:00:00.000Z');
    const cycleEnd = new Date('2026-08-19T00:00:00.000Z');

    await prisma.trainingCycle.upsert({
      where: { id: CYCLE_ID },
      update: {
        name: 'Decisão e resposta às calls — 14 dias',
        startDate: cycleStart,
        endDate: cycleEnd,
        status: TrainingCycleStatus.ACTIVE,
      },
      create: {
        id: CYCLE_ID,
        userId: USER_ID,
        name: 'Decisão e resposta às calls — 14 dias',
        startDate: cycleStart,
        endDate: cycleEnd,
        status: TrainingCycleStatus.ACTIVE,
      },
    });

    const cycleFocuses = [
      {
        focusAreaId: focusAreas[0].id,
        priority: FocusPriority.PRIMARY,
        successCriteria:
          'Reduzir travamentos e relatar clareza de decisão média igual ou superior a 4.',
      },
      {
        focusAreaId: focusAreas[1].id,
        priority: FocusPriority.SECONDARY,
        successCriteria:
          'Responder calls sem atraso perceptível na maioria das situações registradas.',
      },
      {
        focusAreaId: focusAreas[2].id,
        priority: FocusPriority.SECONDARY,
        successCriteria:
          'Registrar padrões reconhecidos e ao menos uma adaptação aplicada por sessão.',
      },
    ] as const;

    for (const cycleFocus of cycleFocuses) {
      await prisma.cycleFocus.upsert({
        where: {
          cycleId_focusAreaId: {
            cycleId: CYCLE_ID,
            focusAreaId: cycleFocus.focusAreaId,
          },
        },
        update: {
          priority: cycleFocus.priority,
          successCriteria: cycleFocus.successCriteria,
        },
        create: {
          cycleId: CYCLE_ID,
          ...cycleFocus,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao carregar o seed do Projeto Radiante.', error);
  process.exitCode = 1;
});
