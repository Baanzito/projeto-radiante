import { BadRequestException, Injectable } from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(weekStart?: string) {
    const plan = weekStart
      ? await this.prisma.weeklyPlan.findFirst({
          where: {
            userId: LOCAL_USER_ID,
            weekStart: this.parseDay(weekStart),
          },
          include: { blocks: true },
        })
      : await this.currentPlan();
    const start = plan?.weekStart ?? this.currentMonday();
    const endExclusive = new Date(plan?.weekEnd ?? start);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + (plan ? 1 : 7));

    const [sessions, matches, feedbacks, activeCycle, review] =
      await Promise.all([
        this.prisma.trainingSession.findMany({
          where: {
            userId: LOCAL_USER_ID,
            startedAt: { gte: start, lt: endExclusive },
          },
        }),
        this.prisma.match.findMany({
          where: {
            userId: LOCAL_USER_ID,
            startedAt: { gte: start, lt: endExclusive },
          },
          include: { reflection: true },
        }),
        this.prisma.coachFeedback.findMany({
          where: {
            userId: LOCAL_USER_ID,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          include: {
            coachSession: { select: { heldAt: true, coachName: true } },
            focusArea: { select: { id: true, name: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.trainingCycle.findFirst({
          where: { userId: LOCAL_USER_ID, status: 'ACTIVE' },
          include: { focuses: { include: { focusArea: true } } },
        }),
        plan
          ? this.prisma.weeklyReview.findUnique({
              where: { weeklyPlanId: plan.id },
            })
          : Promise.resolve(null),
      ]);

    const blocks =
      plan?.blocks.filter((block) => block.status !== 'CANCELLED') ?? [];
    const plannedMinutes = blocks.reduce(
      (total, block) =>
        total + Math.max(0, (+block.plannedEnd - +block.plannedStart) / 60000),
      0,
    );
    const completedSessions = sessions.filter(
      (session) => session.status === 'COMPLETED' && session.endedAt,
    );
    const completedMinutes = completedSessions.reduce(
      (total, session) =>
        total +
        Math.max(
          0,
          ((session.endedAt?.valueOf() ?? session.startedAt.valueOf()) -
            session.startedAt.valueOf()) /
            60000 -
            session.totalPausedSeconds / 60,
        ),
      0,
    );
    const conscious = matches.filter(
      (match) => match.queueType === 'COMPETITIVE' && match.reflection,
    );
    const reflections = matches.flatMap((match) =>
      match.reflection ? [match.reflection] : [],
    );
    const wins = matches.filter((match) => match.result === 'WIN').length;
    const losses = matches.filter((match) => match.result === 'LOSS').length;
    const rrDelta = matches.reduce(
      (total, match) => total + (match.rrChange ?? 0),
      0,
    );
    const average = (values: number[]) =>
      values.length
        ? Number(
            (
              values.reduce((total, value) => total + value, 0) / values.length
            ).toFixed(1),
          )
        : null;
    const patterns = [
      [
        'Travamentos',
        reflections.reduce((sum, item) => sum + item.freezesCount, 0),
      ],
      [
        'Conflitos de tarefas',
        reflections.reduce((sum, item) => sum + item.taskConflictsCount, 0),
      ],
      [
        'Calls atrasadas',
        reflections.reduce((sum, item) => sum + item.delayedCallsCount, 0),
      ],
      [
        'Erros de movimentação',
        reflections.reduce((sum, item) => sum + item.movementErrorsCount, 0),
      ],
      [
        'Erros de posicionamento em ECO',
        reflections.reduce(
          (sum, item) => sum + item.ecoPositioningErrorsCount,
          0,
        ),
      ],
    ]
      .map(([label, count]) => ({ label: String(label), count: Number(count) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      week: {
        planId: plan?.id ?? null,
        weekStart: this.day(start),
        weekEnd: this.day(new Date(endExclusive.valueOf() - 86400000)),
        status: plan?.status ?? null,
        weeklyIntent: plan?.weeklyIntent ?? null,
      },
      adherence: {
        plannedMinutes: Math.round(plannedMinutes),
        completedMinutes: Math.round(completedMinutes),
        timePercent: plannedMinutes
          ? Number(((completedMinutes / plannedMinutes) * 100).toFixed(1))
          : null,
        plannedBlocks: blocks.length,
        completedBlocks: blocks.filter((block) => block.status === 'COMPLETED')
          .length,
        consciousRankedCount: conscious.length,
        rankedTargetMin: plan?.rankedTargetMin ?? 0,
        rankedTargetMax: plan?.rankedTargetMax ?? 0,
      },
      results: {
        matchCount: matches.length,
        wins,
        losses,
        rrDelta,
      },
      process: {
        sampleSize: reflections.length,
        decisionClarity: average(
          reflections.map((item) => item.decisionClarity),
        ),
        callResponse: average(reflections.map((item) => item.callResponse)),
        patternReading: average(reflections.map((item) => item.patternReading)),
        patternsRecognized: reflections.reduce(
          (sum, item) => sum + item.patternsRecognizedCount,
          0,
        ),
        adaptationsApplied: reflections.reduce(
          (sum, item) => sum + item.adaptationsAppliedCount,
          0,
        ),
        repeatedPatterns: patterns,
      },
      coaching: {
        openFeedbackCount: feedbacks.length,
        highPriorityCount: feedbacks.filter((item) =>
          ['HIGH', 'CRITICAL'].includes(item.priority),
        ).length,
        latestPriorityFeedback: feedbacks[0] ?? null,
      },
      cycle: activeCycle
        ? {
            id: activeCycle.id,
            name: activeCycle.name,
            startDate: this.day(activeCycle.startDate),
            endDate: this.day(activeCycle.endDate),
            focuses: activeCycle.focuses.map((focus) => ({
              name: focus.focusArea.name,
              priority: focus.priority,
              successCriteria: focus.successCriteria,
            })),
          }
        : null,
      review: review
        ? {
            id: review.id,
            status: review.status,
            selfConclusion: review.selfConclusion,
          }
        : null,
    };
  }

  private async currentPlan() {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return (
      (await this.prisma.weeklyPlan.findFirst({
        where: {
          userId: LOCAL_USER_ID,
          weekStart: { lte: today },
          weekEnd: { gte: today },
        },
        include: { blocks: true },
      })) ??
      this.prisma.weeklyPlan.findFirst({
        where: { userId: LOCAL_USER_ID },
        include: { blocks: true },
        orderBy: { weekStart: 'desc' },
      })
    );
  }

  private parseDay(value: string) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.valueOf()))
      throw new BadRequestException('Data semanal inválida.');
    return date;
  }

  private currentMonday() {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date;
  }

  private day(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
