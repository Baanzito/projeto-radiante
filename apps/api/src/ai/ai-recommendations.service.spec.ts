import { AiRecommendationsService } from './ai-recommendations.service';
import type { AiCoachProvider } from './ai-coach.provider';

describe('AiRecommendationsService', () => {
  const output = {
    title: 'Semana com mais clareza',
    summary: 'As decisões melhoraram na amostra observada.',
    strengths: ['Calls mais rápidas'],
    patterns: ['Travamento em tarefas concorrentes'],
    nextActions: ['Verbalizar a intenção antes da utilidade'],
    evidence: [
      {
        claim: 'Aderência de 70%.',
        sourceType: 'WeeklyPlan',
        sourceId: 'plan-id',
      },
    ],
    confidence: 'LOW' as const,
    initialHypothesis: true,
    proposal: {
      weeklyIntent: 'Verbalizar a intenção antes de executar.',
      rankedTargetMin: 10,
      rankedTargetMax: 12,
    },
  };

  const provider: AiCoachProvider = {
    status: () => ({
      configured: true,
      model: 'test-model',
      provider: 'openai',
    }),
    generate: jest.fn().mockResolvedValue(output),
  };

  it('persists a proposal without changing the weekly plan', async () => {
    const plan = {
      id: 'plan-id',
      userId: '11111111-1111-4111-8111-111111111111',
      weekStart: new Date('2026-08-03T00:00:00.000Z'),
      blocks: [],
      review: null,
    };
    const prisma = {
      weeklyPlan: {
        findFirst: jest.fn().mockResolvedValue(plan),
        update: jest.fn(),
      },
      coachFeedback: { findMany: jest.fn().mockResolvedValue([]) },
      aiRecommendation: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'ai-id', ...data })),
      },
    };
    const service = new AiRecommendationsService(
      prisma as never,
      { summary: jest.fn().mockResolvedValue({ process: {} }) } as never,
      { record: jest.fn().mockResolvedValue({}) } as never,
      provider,
    );

    const result = await service.weeklyPlanProposal('plan-id');

    expect(result.status).toBeUndefined();
    expect(prisma.weeklyPlan.update).not.toHaveBeenCalled();
    expect(prisma.aiRecommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'WEEKLY_PLAN_PROPOSAL',
          proposedMutation: output.proposal,
        }),
      }),
    );
  });

  it('applies a proposal only through the explicit confirmation command', async () => {
    const recommendation = {
      id: 'ai-id',
      type: 'WEEKLY_PLAN_PROPOSAL',
      status: 'GENERATED',
      sourceId: 'plan-id',
      proposedMutation: output.proposal,
    };
    const plan = {
      id: 'plan-id',
      status: 'CONFIRMED',
      weeklyIntent: 'Intenção anterior',
      rankedTargetMin: 10,
      rankedTargetMax: 14,
    };
    const tx = {
      weeklyPlan: { update: jest.fn().mockResolvedValue({}) },
      aiRecommendation: { update: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      aiRecommendation: {
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValueOnce(recommendation)
          .mockResolvedValueOnce({ ...recommendation, status: 'APPLIED' }),
      },
      weeklyPlan: { findFirst: jest.fn().mockResolvedValue(plan) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new AiRecommendationsService(
      prisma as never,
      {} as never,
      {} as never,
      provider,
    );

    await service.confirm('ai-id', 'Aprovada no teste.');

    expect(tx.weeklyPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-id' },
      data: {
        weeklyIntent: output.proposal.weeklyIntent,
        rankedTargetMin: 10,
        rankedTargetMax: 12,
      },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'AI_PROPOSAL_APPLIED',
          actor: 'AI',
        }),
      }),
    );
  });
});
