import { BadRequestException, Injectable } from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { Prisma } from '../generated/prisma/client';
import type {
  CoachFeedback,
  CoachSession,
  CycleFocus,
  FocusArea,
  Match,
  MatchReflection,
  PlayerProfile,
  RoutineBlock,
  TrainingCycle,
  TrainingSession,
  User,
  WeeklyPlan,
  WeeklyReview,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CsvDataset } from './data-exports.dto';

interface BackupData {
  user: User;
  profile: PlayerProfile | null;
  focusAreas: FocusArea[];
  trainingCycles: TrainingCycle[];
  cycleFocuses: CycleFocus[];
  weeklyPlans: WeeklyPlan[];
  routineBlocks: RoutineBlock[];
  trainingSessions: TrainingSession[];
  matches: Match[];
  matchReflections: MatchReflection[];
  coachSessions: CoachSession[];
  coachFeedbacks: CoachFeedback[];
  weeklyReviews: WeeklyReview[];
}

@Injectable()
export class DataExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async backup() {
    const [
      user,
      focusAreas,
      trainingCycles,
      cycleFocuses,
      weeklyPlans,
      routineBlocks,
      trainingSessions,
      matches,
      matchReflections,
      coachSessions,
      coachFeedbacks,
      weeklyReviews,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: LOCAL_USER_ID },
        include: { profile: true },
      }),
      this.prisma.focusArea.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.trainingCycle.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.cycleFocus.findMany({
        where: { cycle: { userId: LOCAL_USER_ID } },
      }),
      this.prisma.weeklyPlan.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.routineBlock.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.trainingSession.findMany({
        where: { userId: LOCAL_USER_ID },
      }),
      this.prisma.match.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.matchReflection.findMany({
        where: { userId: LOCAL_USER_ID },
      }),
      this.prisma.coachSession.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.coachFeedback.findMany({ where: { userId: LOCAL_USER_ID } }),
      this.prisma.weeklyReview.findMany({ where: { userId: LOCAL_USER_ID } }),
    ]);
    if (!user) throw new BadRequestException('Usuário local não encontrado.');
    const { profile, ...localUser } = user;
    return {
      format: 'projeto-radiante-backup',
      version: 1,
      appVersion: '0.5.0',
      exportedAt: new Date().toISOString(),
      data: {
        user: localUser,
        profile,
        focusAreas,
        trainingCycles,
        cycleFocuses,
        weeklyPlans,
        routineBlocks,
        trainingSessions,
        matches,
        matchReflections,
        coachSessions,
        coachFeedbacks,
        weeklyReviews,
      },
    };
  }

  async csv(dataset: CsvDataset) {
    const rows = await this.csvRows(dataset);
    if (!rows.length) return 'sem_dados\n';
    const headers = Object.keys(rows[0]);
    return [
      headers.map((value) => this.csvCell(value)).join(','),
      ...rows.map((row) =>
        headers.map((header) => this.csvCell(row[header])).join(','),
      ),
    ].join('\n');
  }

  async restore(backup: Record<string, unknown>) {
    if (
      backup.format !== 'projeto-radiante-backup' ||
      backup.version !== 1 ||
      !backup.data ||
      typeof backup.data !== 'object'
    ) {
      throw new BadRequestException(
        'Arquivo de backup inválido ou incompatível.',
      );
    }
    const payload = backup.data as Record<string, unknown>;
    if (!this.isRecord(payload.user) || payload.user.id !== LOCAL_USER_ID) {
      throw new BadRequestException(
        'O backup não pertence ao perfil local esperado.',
      );
    }
    const arrays = [
      'focusAreas',
      'trainingCycles',
      'cycleFocuses',
      'weeklyPlans',
      'routineBlocks',
      'trainingSessions',
      'matches',
      'matchReflections',
      'coachSessions',
      'coachFeedbacks',
      'weeklyReviews',
    ] as const;
    if (arrays.some((key) => !Array.isArray(payload[key]))) {
      throw new BadRequestException('O backup está incompleto.');
    }
    const data = payload as unknown as BackupData;

    await this.prisma.$transaction(async (tx) => {
      const user = data.user;
      await tx.user.upsert({
        where: { id: LOCAL_USER_ID },
        create: {
          id: LOCAL_USER_ID,
          displayName: user.displayName,
          timezone: user.timezone,
          createdAt: this.date(user.createdAt),
          updatedAt: this.date(user.updatedAt),
        },
        update: { displayName: user.displayName, timezone: user.timezone },
      });
      if (data.profile) {
        const profile = data.profile;
        const profileValues = {
          currentRank: profile.currentRank,
          currentRr: profile.currentRr,
          peakRank: profile.peakRank,
          valorantName: profile.valorantName,
          valorantTag: profile.valorantTag,
          sensitivity: profile.sensitivity,
          dpi: profile.dpi,
          primaryGoal: profile.primaryGoal,
          weeklyRankedMin: profile.weeklyRankedMin,
          weeklyRankedMax: profile.weeklyRankedMax,
          defaultSessionStart: profile.defaultSessionStart
            ? this.date(profile.defaultSessionStart)
            : null,
          defaultSessionEnd: profile.defaultSessionEnd
            ? this.date(profile.defaultSessionEnd)
            : null,
        };
        await tx.playerProfile.upsert({
          where: { userId: LOCAL_USER_ID },
          create: { userId: LOCAL_USER_ID, ...profileValues },
          update: profileValues,
        });
      }
      for (const item of data.focusAreas) {
        const values = {
          userId: LOCAL_USER_ID,
          name: item.name,
          category: item.category,
          observableBehavior: item.observableBehavior,
          active: item.active,
        };
        await tx.focusArea.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.trainingCycles) {
        const values = {
          userId: LOCAL_USER_ID,
          name: item.name,
          startDate: this.date(item.startDate),
          endDate: this.date(item.endDate),
          status: item.status,
          conclusion: item.conclusion,
          conclusionNotes: item.conclusionNotes,
        };
        await tx.trainingCycle.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.weeklyPlans) {
        const values = {
          userId: LOCAL_USER_ID,
          weekStart: this.date(item.weekStart),
          weekEnd: this.date(item.weekEnd),
          status: item.status,
          rankedTargetMin: item.rankedTargetMin,
          rankedTargetMax: item.rankedTargetMax,
          weeklyIntent: item.weeklyIntent,
        };
        await tx.weeklyPlan.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.coachSessions) {
        const values = {
          userId: LOCAL_USER_ID,
          coachName: item.coachName,
          heldAt: this.date(item.heldAt),
          durationMinutes: item.durationMinutes,
          summary: item.summary,
        };
        await tx.coachSession.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.routineBlocks) {
        const values = {
          weeklyPlanId: item.weeklyPlanId,
          userId: LOCAL_USER_ID,
          focusAreaId: item.focusAreaId,
          type: item.type,
          status: item.status,
          title: item.title,
          plannedStart: this.date(item.plannedStart),
          plannedEnd: this.date(item.plannedEnd),
          notes: item.notes,
          cancellationReason: item.cancellationReason,
        };
        await tx.routineBlock.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.trainingSessions) {
        const values = {
          userId: LOCAL_USER_ID,
          plannedBlockId: item.plannedBlockId,
          focusAreaId: item.focusAreaId,
          type: item.type,
          startedAt: this.date(item.startedAt),
          endedAt: item.endedAt ? this.date(item.endedAt) : null,
          status: item.status,
          pausedAt: item.pausedAt ? this.date(item.pausedAt) : null,
          totalPausedSeconds: item.totalPausedSeconds,
          preEnergy: item.preEnergy,
          preFocus: item.preFocus,
          overallConcentration: item.overallConcentration,
          focusAdherence: item.focusAdherence,
          mainLearning: item.mainLearning,
          nextAdjustment: item.nextAdjustment,
          mentalState: item.mentalState,
          cancellationReason: item.cancellationReason,
        };
        await tx.trainingSession.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.matches) {
        const values = {
          userId: LOCAL_USER_ID,
          sessionId: item.sessionId,
          source: item.source,
          riotMatchId: item.riotMatchId,
          startedAt: this.date(item.startedAt),
          queueType: item.queueType,
          agentName: item.agentName,
          mapName: item.mapName,
          result: item.result,
          allyScore: item.allyScore,
          enemyScore: item.enemyScore,
          rrChange: item.rrChange,
          kills: item.kills,
          deaths: item.deaths,
          assists: item.assists,
          acs: item.acs,
          headshotPct: item.headshotPct,
          firstKills: item.firstKills,
          firstDeaths: item.firstDeaths,
          notes: item.notes,
        };
        await tx.match.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.matchReflections) {
        const values = {
          matchId: item.matchId,
          userId: LOCAL_USER_ID,
          decisionClarity: item.decisionClarity,
          callResponse: item.callResponse,
          patternReading: item.patternReading,
          freezesCount: item.freezesCount,
          taskConflictsCount: item.taskConflictsCount,
          delayedCallsCount: item.delayedCallsCount,
          communicatedIntentionsCount: item.communicatedIntentionsCount,
          movementErrorsCount: item.movementErrorsCount,
          ecoPositioningErrorsCount: item.ecoPositioningErrorsCount,
          unnecessaryCrosshairMovesCount: item.unnecessaryCrosshairMovesCount,
          patternsRecognizedCount: item.patternsRecognizedCount,
          adaptationsAppliedCount: item.adaptationsAppliedCount,
          goodDecision: item.goodDecision,
          nextCorrection: item.nextCorrection,
        };
        await tx.matchReflection.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.coachFeedbacks) {
        const values = {
          coachSessionId: item.coachSessionId,
          userId: LOCAL_USER_ID,
          focusAreaId: item.focusAreaId,
          category: item.category,
          priority: item.priority,
          feedbackText: item.feedbackText,
          evidence: item.evidence,
          suggestedAction: item.suggestedAction,
          status: item.status,
        };
        await tx.coachFeedback.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.weeklyReviews) {
        const values = {
          userId: LOCAL_USER_ID,
          weeklyPlanId: item.weeklyPlanId,
          plannedMinutes: item.plannedMinutes,
          completedMinutes: item.completedMinutes,
          consciousRankedCount: item.consciousRankedCount,
          wins: item.wins,
          losses: item.losses,
          rrDelta: item.rrDelta,
          selfConclusion: item.selfConclusion,
          repeatedPatterns: Array.isArray(item.repeatedPatterns)
            ? (item.repeatedPatterns as Prisma.InputJsonValue)
            : [],
          nextWeekProposal:
            item.nextWeekProposal === null
              ? Prisma.DbNull
              : (item.nextWeekProposal as Prisma.InputJsonValue),
          status: item.status,
        };
        await tx.weeklyReview.upsert({
          where: { id: item.id },
          create: { id: item.id, ...values },
          update: values,
        });
      }
      for (const item of data.cycleFocuses) {
        const values = {
          priority: item.priority,
          successCriteria: item.successCriteria,
        };
        await tx.cycleFocus.upsert({
          where: {
            cycleId_focusAreaId: {
              cycleId: item.cycleId,
              focusAreaId: item.focusAreaId,
            },
          },
          create: {
            cycleId: item.cycleId,
            focusAreaId: item.focusAreaId,
            ...values,
          },
          update: values,
        });
      }
    });
    return {
      restored: true,
      counts: Object.fromEntries(arrays.map((key) => [key, data[key].length])),
    };
  }

  private async csvRows(
    dataset: CsvDataset,
  ): Promise<Record<string, unknown>[]> {
    const where = { userId: LOCAL_USER_ID };
    if (dataset === 'matches') return this.prisma.match.findMany({ where });
    if (dataset === 'reflections')
      return this.prisma.matchReflection.findMany({ where });
    if (dataset === 'sessions')
      return this.prisma.trainingSession.findMany({ where });
    if (dataset === 'weekly-plans')
      return this.prisma.weeklyPlan.findMany({ where });
    if (dataset === 'coach-feedbacks')
      return this.prisma.coachFeedback.findMany({ where });
    return this.prisma.weeklyReview.findMany({ where });
  }

  private csvCell(value: unknown) {
    const normalized =
      value === null || value === undefined
        ? ''
        : value instanceof Date
          ? value.toISOString()
          : typeof value === 'object'
            ? JSON.stringify(value)
            : typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ? String(value)
              : '';
    const safe =
      typeof value === 'string' && /^[\s]*[=+\-@]/.test(normalized)
        ? `'${normalized}`
        : normalized;
    return `"${safe.replaceAll('"', '""')}"`;
  }

  private date(value: unknown) {
    const date = new Date(String(value));
    if (Number.isNaN(date.valueOf()))
      throw new BadRequestException('O backup contém uma data inválida.');
    return date;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
