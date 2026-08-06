import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { DashboardService } from '../dashboard/dashboard.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateWeeklyReviewDto,
  UpdateWeeklyReviewDto,
  WeeklyReviewListQueryDto,
} from './weekly-reviews.dto';

const include = {
  weeklyPlan: {
    select: {
      weekStart: true,
      weekEnd: true,
      status: true,
      weeklyIntent: true,
      rankedTargetMin: true,
      rankedTargetMax: true,
    },
  },
} satisfies Prisma.WeeklyReviewInclude;

type ReviewWithPlan = Prisma.WeeklyReviewGetPayload<{
  include: typeof include;
}>;

@Injectable()
export class WeeklyReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  async list(query: WeeklyReviewListQueryDto) {
    const reviews = await this.prisma.weeklyReview.findMany({
      where: {
        userId: LOCAL_USER_ID,
        ...(query.status ? { status: query.status } : {}),
      },
      include,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((review) => this.map(review));
  }

  async get(id: string) {
    return this.map(await this.find(id));
  }

  async generate(input: GenerateWeeklyReviewDto) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { id: input.weeklyPlanId, userId: LOCAL_USER_ID },
    });
    if (!plan)
      throw new NotFoundException('Planejamento semanal não encontrado.');
    const summary = await this.dashboard.summary(
      plan.weekStart.toISOString().slice(0, 10),
    );
    const patterns = summary.process.repeatedPatterns.map((item) => item.label);
    const existing = await this.prisma.weeklyReview.findUnique({
      where: { weeklyPlanId: plan.id },
    });
    const review = await this.prisma.weeklyReview.upsert({
      where: { weeklyPlanId: plan.id },
      create: {
        userId: LOCAL_USER_ID,
        weeklyPlanId: plan.id,
        plannedMinutes: summary.adherence.plannedMinutes,
        completedMinutes: summary.adherence.completedMinutes,
        consciousRankedCount: summary.adherence.consciousRankedCount,
        wins: summary.results.wins,
        losses: summary.results.losses,
        rrDelta: summary.results.rrDelta,
        repeatedPatterns: patterns,
      },
      update: {
        plannedMinutes: summary.adherence.plannedMinutes,
        completedMinutes: summary.adherence.completedMinutes,
        consciousRankedCount: summary.adherence.consciousRankedCount,
        wins: summary.results.wins,
        losses: summary.results.losses,
        rrDelta: summary.results.rrDelta,
        ...(!existing?.selfConclusion ? { repeatedPatterns: patterns } : {}),
      },
      include,
    });
    return this.map(review);
  }

  async update(id: string, input: UpdateWeeklyReviewDto) {
    const review = await this.find(id);
    if (review.status === 'APPLIED') {
      throw new ConflictException(
        'Uma revisão aplicada não pode mais ser alterada.',
      );
    }
    return this.map(
      await this.prisma.weeklyReview.update({
        where: { id },
        data: {
          selfConclusion: input.selfConclusion.trim(),
          repeatedPatterns: input.repeatedPatterns
            .map((item) => item.trim())
            .filter(Boolean),
          nextWeekProposal: input.nextWeekProposal?.trim()
            ? { text: input.nextWeekProposal.trim() }
            : undefined,
          status: 'REVIEWED',
        },
        include,
      }),
    );
  }

  async apply(id: string) {
    const review = await this.find(id);
    if (review.status !== 'REVIEWED' || !review.selfConclusion?.trim()) {
      throw new ConflictException(
        'Revise e registre sua conclusão antes de aplicar.',
      );
    }
    return this.map(
      await this.prisma.weeklyReview.update({
        where: { id },
        data: { status: 'APPLIED' },
        include,
      }),
    );
  }

  private async find(id: string): Promise<ReviewWithPlan> {
    const review = await this.prisma.weeklyReview.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include,
    });
    if (!review) throw new NotFoundException('Revisão semanal não encontrada.');
    return review;
  }

  private map(review: ReviewWithPlan) {
    const proposal = review.nextWeekProposal;
    return {
      ...review,
      weeklyPlan: {
        ...review.weeklyPlan,
        weekStart: review.weeklyPlan.weekStart.toISOString().slice(0, 10),
        weekEnd: review.weeklyPlan.weekEnd.toISOString().slice(0, 10),
      },
      repeatedPatterns: Array.isArray(review.repeatedPatterns)
        ? review.repeatedPatterns.filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
      nextWeekProposal:
        proposal &&
        !Array.isArray(proposal) &&
        typeof proposal === 'object' &&
        'text' in proposal &&
        typeof proposal.text === 'string'
          ? proposal.text || null
          : null,
    };
  }
}
