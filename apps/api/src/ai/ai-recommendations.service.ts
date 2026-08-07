import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  AI_COACH_PROVIDER,
  type AiCoachOutput,
  type AiCoachProvider,
  type AiGenerationKind,
} from './ai-coach.provider';

const PROMPT_VERSION = 'marco-5-v1';

@Injectable()
export class AiRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService,
    @Inject(AI_COACH_PROVIDER) private readonly provider: AiCoachProvider,
  ) {}

  status() {
    return {
      ...this.provider.status(),
      storeResponses: false,
      writesRequireConfirmation: true,
    };
  }

  async list() {
    return this.prisma.aiRecommendation.findMany({
      where: { userId: LOCAL_USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async sessionSummary(sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, userId: LOCAL_USER_ID },
      include: {
        focusArea: {
          select: { id: true, name: true, observableBehavior: true },
        },
        plannedBlock: { select: { id: true, title: true, notes: true } },
        matches: {
          include: { reflection: true },
          orderBy: { startedAt: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    return this.generate('SESSION_SUMMARY', 'TrainingSession', session.id, {
      session: this.safe(session),
    });
  }

  async weeklySummary(weeklyPlanId: string) {
    return this.generateForWeek('WEEKLY_SUMMARY', weeklyPlanId);
  }

  async weeklyPlanProposal(weeklyPlanId: string) {
    return this.generateForWeek('WEEKLY_PLAN_PROPOSAL', weeklyPlanId);
  }

  async confirm(id: string, reason?: string) {
    const recommendation = await this.find(id);
    if (recommendation.status !== 'GENERATED') {
      throw new ConflictException('Esta recomendação já foi decidida.');
    }
    if (
      recommendation.type !== 'WEEKLY_PLAN_PROPOSAL' ||
      !recommendation.sourceId
    ) {
      throw new ConflictException(
        'Somente propostas de semana podem ser aplicadas.',
      );
    }
    const mutation = this.readMutation(recommendation.proposedMutation);
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: recommendation.sourceId, userId: LOCAL_USER_ID },
    });
    if (!plan)
      throw new NotFoundException('Semana da proposta não encontrada.');
    if (plan.status === 'CLOSED') {
      throw new ConflictException(
        'Uma semana encerrada não pode receber a proposta.',
      );
    }
    const before = {
      weeklyIntent: plan.weeklyIntent,
      rankedTargetMin: plan.rankedTargetMin,
      rankedTargetMax: plan.rankedTargetMax,
    };
    const after = {
      weeklyIntent: mutation.weeklyIntent ?? plan.weeklyIntent,
      rankedTargetMin: mutation.rankedTargetMin ?? plan.rankedTargetMin,
      rankedTargetMax: mutation.rankedTargetMax ?? plan.rankedTargetMax,
    };
    if (after.rankedTargetMin > after.rankedTargetMax) {
      throw new ConflictException(
        'A proposta possui uma meta semanal inválida.',
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.weeklyPlan.update({ where: { id: plan.id }, data: after });
      await tx.aiRecommendation.update({
        where: { id },
        data: { status: 'APPLIED', decidedAt: now, appliedAt: now },
      });
      await tx.auditEvent.create({
        data: {
          userId: LOCAL_USER_ID,
          actor: 'AI',
          action: 'AI_PROPOSAL_APPLIED',
          entityType: 'WeeklyPlan',
          entityId: plan.id,
          summary:
            'Proposta da IA aplicada após confirmação explícita do usuário.',
          before,
          after,
          metadata: { recommendationId: id, reason: reason?.trim() || null },
        },
      });
    });
    return this.find(id);
  }

  async reject(id: string, reason?: string) {
    const recommendation = await this.find(id);
    if (recommendation.status !== 'GENERATED') {
      throw new ConflictException('Esta recomendação já foi decidida.');
    }
    const updated = await this.prisma.aiRecommendation.update({
      where: { id },
      data: { status: 'REJECTED', decidedAt: new Date() },
    });
    await this.audit.record({
      actor: 'USER',
      action: 'AI_RECOMMENDATION_REJECTED',
      entityType: 'AiRecommendation',
      entityId: id,
      summary: 'Recomendação da IA rejeitada pelo usuário.',
      metadata: { reason: reason?.trim() || null },
    });
    return updated;
  }

  private async generateForWeek(kind: AiGenerationKind, weeklyPlanId: string) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: weeklyPlanId, userId: LOCAL_USER_ID },
      include: { blocks: { orderBy: { plannedStart: 'asc' } }, review: true },
    });
    if (!plan)
      throw new NotFoundException('Planejamento semanal não encontrado.');
    const [summary, feedbacks] = await Promise.all([
      this.dashboard.summary(plan.weekStart.toISOString().slice(0, 10)),
      this.prisma.coachFeedback.findMany({
        where: {
          userId: LOCAL_USER_ID,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        select: {
          id: true,
          category: true,
          priority: true,
          feedbackText: true,
          evidence: true,
          suggestedAction: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);
    return this.generate(kind, 'WeeklyPlan', plan.id, {
      plan: this.safe(plan),
      dashboard: summary,
      activeCoachFeedbacks: feedbacks.map((item) => this.safe(item)),
    });
  }

  private async generate(
    kind: AiGenerationKind,
    sourceType: string,
    sourceId: string,
    evidence: unknown,
  ) {
    if (!this.provider.status().configured) {
      throw new ServiceUnavailableException(
        'Configure OPENAI_API_KEY no backend para habilitar o assistente.',
      );
    }
    try {
      const generatedOutput = await this.provider.generate(kind, evidence);
      const independentEvidence = new Set(
        generatedOutput.evidence.map(
          (item) => `${item.sourceType}:${item.sourceId ?? item.claim}`,
        ),
      ).size;
      const output: AiCoachOutput =
        independentEvidence < 3
          ? {
              ...generatedOutput,
              confidence: 'LOW',
              initialHypothesis: true,
            }
          : generatedOutput;
      const proposal = kind === 'WEEKLY_PLAN_PROPOSAL' ? output.proposal : null;
      if (kind === 'WEEKLY_PLAN_PROPOSAL' && !proposal) {
        throw new Error('A resposta não trouxe a proposta semanal esperada.');
      }
      const saved = await this.prisma.aiRecommendation.create({
        data: {
          userId: LOCAL_USER_ID,
          type: kind,
          sourceType,
          sourceId,
          model: this.provider.status().model,
          promptVersion: PROMPT_VERSION,
          structuredOutput: output as Prisma.InputJsonValue,
          proposedMutation: proposal
            ? (proposal as Prisma.InputJsonValue)
            : undefined,
        },
      });
      await this.audit.record({
        actor: 'AI',
        action: 'AI_RECOMMENDATION_GENERATED',
        entityType: 'AiRecommendation',
        entityId: saved.id,
        summary: `Recomendação estruturada ${kind} gerada sem alterar dados locais.`,
        metadata: { sourceType, sourceId, promptVersion: PROMPT_VERSION },
      });
      return saved;
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message.slice(0, 500)
          : 'Falha desconhecida.';
      const failed = await this.prisma.aiRecommendation.create({
        data: {
          userId: LOCAL_USER_ID,
          type: kind,
          status: 'FAILED',
          sourceType,
          sourceId,
          model: this.provider.status().model,
          promptVersion: PROMPT_VERSION,
          structuredOutput: {},
          failureReason: detail,
        },
      });
      await this.audit.record({
        actor: 'AI',
        action: 'AI_RECOMMENDATION_FAILED',
        entityType: 'AiRecommendation',
        entityId: failed.id,
        summary: `Falha ao gerar recomendação estruturada ${kind}; dados locais preservados.`,
        metadata: { sourceType, sourceId, promptVersion: PROMPT_VERSION },
      });
      throw new ServiceUnavailableException(
        'A integração com a OpenAI falhou. Seus dados locais não foram alterados.',
      );
    }
  }

  private find(id: string) {
    return this.prisma.aiRecommendation
      .findFirstOrThrow({
        where: { id, userId: LOCAL_USER_ID },
      })
      .catch(() => {
        throw new NotFoundException('Recomendação não encontrada.');
      });
  }

  private readMutation(value: Prisma.JsonValue | null) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new ConflictException(
        'A proposta não possui uma alteração válida.',
      );
    }
    const object = value as Record<string, unknown>;
    return {
      weeklyIntent:
        typeof object.weeklyIntent === 'string'
          ? object.weeklyIntent.trim()
          : null,
      rankedTargetMin: Number.isInteger(object.rankedTargetMin)
        ? Number(object.rankedTargetMin)
        : null,
      rankedTargetMax: Number.isInteger(object.rankedTargetMax)
        ? Number(object.rankedTargetMax)
        : null,
    };
  }

  private safe<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, item) =>
        typeof item === 'string' && item.length > 1500
          ? `${item.slice(0, 1500)}…`
          : item,
      ),
    ) as T;
  }
}
