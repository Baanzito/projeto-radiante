import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMatchDto,
  MatchListQueryDto,
  UpdateMatchDto,
  UpsertReflectionDto,
} from './matches.dto';

const matchInclude = {
  reflection: true,
  session: {
    include: { plannedBlock: { select: { title: true } } },
  },
};
type StoredMatch = any;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MatchListQueryDto) {
    const where = {
      userId: LOCAL_USER_ID,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where,
        include: matchInclude,
        orderBy: { startedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.match.count({ where }),
    ]);
    return {
      items: items.map((match) => this.mapMatch(match)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string) {
    return this.mapMatch(await this.findOwned(id));
  }

  async summary() {
    const matches = await this.prisma.match.findMany({
      where: { userId: LOCAL_USER_ID },
      select: {
        sessionId: true,
        result: true,
        rrChange: true,
        kills: true,
        deaths: true,
        assists: true,
        acs: true,
        headshotPct: true,
        firstKills: true,
        firstDeaths: true,
        reflection: {
          select: {
            decisionClarity: true,
            callResponse: true,
            patternReading: true,
          },
        },
      },
    });
    const values = (field: string) =>
      matches
        .map((match: any) => match[field])
        .filter(
          (value: unknown): value is number =>
            value !== null && value !== undefined,
        )
        .map(Number);
    const average = (items: number[], precision = 1) =>
      items.length
        ? Number(
            (
              items.reduce((total, value) => total + value, 0) / items.length
            ).toFixed(precision),
          )
        : null;
    const wins = matches.filter((match) => match.result === 'WIN').length;
    const losses = matches.filter((match) => match.result === 'LOSS').length;
    const draws = matches.filter((match) => match.result === 'DRAW').length;
    const decided = wins + losses + draws;
    const rr = values('rrChange');
    const kills = values('kills');
    const deaths = values('deaths');
    const reflections = matches.flatMap((match) =>
      match.reflection ? [match.reflection] : [],
    );
    const kdMatches = matches.filter(
      (match) => match.kills !== null && match.deaths !== null,
    );
    const kdKills = kdMatches.reduce(
      (total, match) => total + (match.kills ?? 0),
      0,
    );
    const kdDeaths = kdMatches.reduce(
      (total, match) => total + (match.deaths ?? 0),
      0,
    );

    return {
      totalMatches: matches.length,
      linkedSessions: new Set(
        matches.map((match) => match.sessionId).filter(Boolean),
      ).size,
      wins,
      losses,
      draws,
      winRate: decided ? Number(((wins / decided) * 100).toFixed(1)) : null,
      totalRr: rr.reduce((total, value) => total + value, 0),
      averageRr: average(rr),
      averageKills: average(kills),
      averageDeaths: average(deaths),
      averageAssists: average(values('assists')),
      kdRatio: kdDeaths ? Number((kdKills / kdDeaths).toFixed(2)) : null,
      averageAcs: average(values('acs')),
      averageHeadshotPct: average(values('headshotPct')),
      averageFirstKills: average(values('firstKills')),
      averageFirstDeaths: average(values('firstDeaths')),
      reflectionCount: reflections.length,
      averageDecisionClarity: average(
        reflections.map((item) => item.decisionClarity),
      ),
      averageCallResponse: average(
        reflections.map((item) => item.callResponse),
      ),
      averagePatternReading: average(
        reflections.map((item) => item.patternReading),
      ),
    };
  }

  async create(input: CreateMatchDto) {
    if (input.sessionId) await this.assertOpenSession(input.sessionId);
    const startedAt = new Date(input.startedAt);
    if (Number.isNaN(startedAt.valueOf()))
      throw new BadRequestException('Início da partida inválido.');
    const match = await this.prisma.match.create({
      data: {
        userId: LOCAL_USER_ID,
        sessionId: input.sessionId || null,
        source: 'MANUAL',
        startedAt,
        queueType: input.queueType,
        agentName: input.agentName.trim(),
        mapName: input.mapName.trim(),
        result: input.result,
        allyScore: input.allyScore,
        enemyScore: input.enemyScore,
        rrChange: input.rrChange,
        kills: input.kills,
        deaths: input.deaths,
        assists: input.assists,
        acs: input.acs,
        headshotPct: input.headshotPct,
        firstKills: input.firstKills,
        firstDeaths: input.firstDeaths,
        notes: input.notes?.trim() || null,
      },
      include: matchInclude,
    });
    return this.mapMatch(match);
  }

  async update(id: string, input: UpdateMatchDto) {
    const current = await this.findOwned(id);
    if (
      input.sessionId !== undefined &&
      input.sessionId !== current.sessionId &&
      input.sessionId
    ) {
      await this.assertOpenSession(input.sessionId);
    }
    const match = await this.prisma.match.update({
      where: { id },
      data: {
        ...(input.sessionId !== undefined
          ? { sessionId: input.sessionId || null }
          : {}),
        ...(input.startedAt ? { startedAt: new Date(input.startedAt) } : {}),
        ...(input.queueType ? { queueType: input.queueType } : {}),
        ...(input.agentName !== undefined
          ? { agentName: input.agentName.trim() }
          : {}),
        ...(input.mapName !== undefined
          ? { mapName: input.mapName.trim() }
          : {}),
        ...(input.result ? { result: input.result } : {}),
        ...(input.allyScore !== undefined
          ? { allyScore: input.allyScore }
          : {}),
        ...(input.enemyScore !== undefined
          ? { enemyScore: input.enemyScore }
          : {}),
        ...(input.rrChange !== undefined ? { rrChange: input.rrChange } : {}),
        ...(input.kills !== undefined ? { kills: input.kills } : {}),
        ...(input.deaths !== undefined ? { deaths: input.deaths } : {}),
        ...(input.assists !== undefined ? { assists: input.assists } : {}),
        ...(input.acs !== undefined ? { acs: input.acs } : {}),
        ...(input.headshotPct !== undefined
          ? { headshotPct: input.headshotPct }
          : {}),
        ...(input.firstKills !== undefined
          ? { firstKills: input.firstKills }
          : {}),
        ...(input.firstDeaths !== undefined
          ? { firstDeaths: input.firstDeaths }
          : {}),
        ...(input.notes !== undefined
          ? { notes: input.notes?.trim() || null }
          : {}),
      },
      include: matchInclude,
    });
    return this.mapMatch(match);
  }

  async getReflection(matchId: string) {
    await this.findOwned(matchId);
    const reflection = await this.prisma.matchReflection.findUnique({
      where: { matchId },
    });
    if (!reflection)
      throw new NotFoundException('Reflexão ainda não preenchida.');
    return reflection;
  }

  async upsertReflection(matchId: string, input: UpsertReflectionDto) {
    await this.findOwned(matchId);
    return this.prisma.matchReflection.upsert({
      where: { matchId },
      create: { matchId, userId: LOCAL_USER_ID, ...this.reflectionData(input) },
      update: this.reflectionData(input),
    });
  }

  async pending() {
    const matches = await this.prisma.match.findMany({
      where: { userId: LOCAL_USER_ID, reflection: null },
      include: matchInclude,
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return matches.map((match) => this.mapMatch(match));
  }

  private reflectionData(input: UpsertReflectionDto) {
    return {
      decisionClarity: input.decisionClarity,
      callResponse: input.callResponse,
      patternReading: input.patternReading,
      freezesCount: input.freezesCount,
      taskConflictsCount: input.taskConflictsCount,
      delayedCallsCount: input.delayedCallsCount,
      communicatedIntentionsCount: input.communicatedIntentionsCount,
      movementErrorsCount: input.movementErrorsCount,
      ecoPositioningErrorsCount: input.ecoPositioningErrorsCount,
      unnecessaryCrosshairMovesCount: input.unnecessaryCrosshairMovesCount,
      patternsRecognizedCount: input.patternsRecognizedCount,
      adaptationsAppliedCount: input.adaptationsAppliedCount,
      goodDecision: input.goodDecision?.trim() || null,
      nextCorrection: input.nextCorrection?.trim() || null,
    };
  }

  private async assertOpenSession(id: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      select: { status: true },
    });
    if (!session)
      throw new NotFoundException('Sessão de treino não encontrada.');
    if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) {
      throw new BadRequestException(
        'Partidas só podem ser adicionadas a uma sessão aberta.',
      );
    }
  }

  private async findOwned(id: string): Promise<StoredMatch> {
    const match = await this.prisma.match.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include: matchInclude,
    });
    if (!match) throw new NotFoundException('Partida não encontrada.');
    return match;
  }

  private mapMatch(match: StoredMatch) {
    const { session, ...stored } = match;
    return {
      ...stored,
      startedAt: match.startedAt.toISOString(),
      headshotPct:
        match.headshotPct === null ? null : Number(match.headshotPct),
      session: session
        ? {
            id: session.id,
            type: session.type,
            status: session.status,
            startedAt: session.startedAt.toISOString(),
            endedAt: session.endedAt?.toISOString() ?? null,
            plannedBlockTitle: session.plannedBlock?.title ?? null,
          }
        : null,
      reflectionPending: !match.reflection,
    };
  }
}
