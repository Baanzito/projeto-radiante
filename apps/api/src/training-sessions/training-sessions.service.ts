import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelSessionDto,
  CompleteSessionDto,
  CreateSessionDto,
} from './training-sessions.dto';
const include = {
  plannedBlock: { select: { title: true } },
  focusArea: { select: { name: true } },
};
type Session = any;
@Injectable()
export class TrainingSessionsService {
  constructor(private p: PrismaService) {}
  async active() {
    const s = await this.p.trainingSession.findFirst({
      where: {
        userId: LOCAL_USER_ID,
        status: { in: ['IN_PROGRESS', 'PAUSED'] },
      },
      include,
    });
    return s ? this.map(s) : null;
  }
  async get(id: string) {
    return this.map(await this.find(id));
  }
  async create(d: CreateSessionDto) {
    if (
      await this.p.trainingSession.findFirst({
        where: {
          userId: LOCAL_USER_ID,
          status: { in: ['IN_PROGRESS', 'PAUSED'] },
        },
      })
    )
      throw new ConflictException('Já existe uma sessão ativa ou pausada.');
    let type = d.type,
      focus = d.focusAreaId || null,
      blockId: string | null = null;
    if (d.plannedBlockId) {
      const b = await this.p.routineBlock.findFirst({
        where: { id: d.plannedBlockId, userId: LOCAL_USER_ID },
        include: { session: true },
      });
      if (!b) throw new NotFoundException('Bloco planejado não encontrado.');
      if (b.status !== 'CONFIRMED' || b.session)
        throw new ConflictException(
          'Somente um bloco confirmado e não utilizado pode iniciar uma sessão.',
        );
      type = b.type;
      focus = b.focusAreaId;
      blockId = b.id;
    } else if (!type)
      throw new BadRequestException('Informe o tipo para uma sessão avulsa.');
    if (
      focus &&
      !(await this.p.focusArea.findFirst({
        where: { id: focus, userId: LOCAL_USER_ID, active: true },
      }))
    )
      throw new BadRequestException('Selecione uma área de foco ativa.');
    try {
      const s = await this.p.$transaction(async (tx) => {
        const made = await tx.trainingSession.create({
          data: {
            userId: LOCAL_USER_ID,
            plannedBlockId: blockId,
            focusAreaId: focus,
            type: type!,
            startedAt: new Date(),
            preEnergy: d.preEnergy,
            preFocus: d.preFocus,
          },
          include,
        });
        if (blockId)
          await tx.routineBlock.update({
            where: { id: blockId },
            data: { status: 'IN_PROGRESS' },
          });
        return made;
      });
      return this.map(s);
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'Já existe uma sessão ativa ou este bloco já foi utilizado.',
        );
      throw e;
    }
  }
  async pause(id: string) {
    const s = await this.find(id);
    if (s.status !== 'IN_PROGRESS')
      throw new ConflictException(
        'Somente uma sessão em andamento pode ser pausada.',
      );
    return this.map(
      await this.p.trainingSession.update({
        where: { id },
        data: { status: 'PAUSED', pausedAt: new Date() },
        include,
      }),
    );
  }
  async resume(id: string) {
    const s = await this.find(id);
    if (s.status !== 'PAUSED' || !s.pausedAt)
      throw new ConflictException(
        'Somente uma sessão pausada pode ser retomada.',
      );
    const extra = Math.max(
      0,
      Math.floor((Date.now() - s.pausedAt.valueOf()) / 1000),
    );
    return this.map(
      await this.p.trainingSession.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          pausedAt: null,
          totalPausedSeconds: s.totalPausedSeconds + extra,
        },
        include,
      }),
    );
  }
  async complete(id: string, d: CompleteSessionDto) {
    const s = await this.find(id);
    this.open(s);
    if (!d.mainLearning.trim() || !d.nextAdjustment.trim())
      throw new BadRequestException(
        'Aprendizado e próximo ajuste são obrigatórios.',
      );
    const now = new Date(),
      paused = this.paused(s, now);
    const done = await this.p.$transaction(async (tx) => {
      const x = await tx.trainingSession.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endedAt: now,
          pausedAt: null,
          totalPausedSeconds: paused,
          overallConcentration: d.overallConcentration,
          focusAdherence: d.focusAdherence,
          mainLearning: d.mainLearning.trim(),
          nextAdjustment: d.nextAdjustment.trim(),
          mentalState: d.mentalState?.trim() || null,
        },
        include,
      });
      if (s.plannedBlockId)
        await tx.routineBlock.update({
          where: { id: s.plannedBlockId },
          data: { status: 'COMPLETED' },
        });
      return x;
    });
    return this.map(done);
  }
  async cancel(id: string, d: CancelSessionDto) {
    const s = await this.find(id);
    this.open(s);
    const now = new Date();
    const x = await this.p.$transaction(async (tx) => {
      const y = await tx.trainingSession.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          endedAt: now,
          pausedAt: null,
          totalPausedSeconds: this.paused(s, now),
          cancellationReason: d.reason?.trim() || null,
        },
        include,
      });
      if (s.plannedBlockId)
        await tx.routineBlock.update({
          where: { id: s.plannedBlockId },
          data: {
            status: 'CANCELLED',
            cancellationReason: d.reason?.trim() || null,
          },
        });
      return y;
    });
    return this.map(x);
  }
  private async find(id: string): Promise<Session> {
    const s = await this.p.trainingSession.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include,
    });
    if (!s) throw new NotFoundException('Sessão de treino não encontrada.');
    return s;
  }
  private open(s: Session) {
    if (!['IN_PROGRESS', 'PAUSED'].includes(s.status))
      throw new ConflictException('Esta sessão já foi encerrada.');
  }
  private paused(s: Session, now: Date) {
    return (
      s.totalPausedSeconds +
      (s.status === 'PAUSED' && s.pausedAt
        ? Math.max(0, Math.floor((+now - +s.pausedAt) / 1000))
        : 0)
    );
  }
  private map(s: Session) {
    const ref = s.endedAt ?? new Date(),
      paused = this.paused(s, ref);
    return {
      id: s.id,
      plannedBlockId: s.plannedBlockId,
      plannedBlockTitle: s.plannedBlock?.title ?? null,
      focusAreaId: s.focusAreaId,
      focusAreaName: s.focusArea?.name ?? null,
      type: s.type,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      pausedAt: s.pausedAt?.toISOString() ?? null,
      totalPausedSeconds: paused,
      elapsedSeconds: Math.max(
        0,
        Math.floor((+ref - +s.startedAt) / 1000) - paused,
      ),
      preEnergy: s.preEnergy,
      preFocus: s.preFocus,
      overallConcentration: s.overallConcentration,
      focusAdherence: s.focusAdherence,
      mainLearning: s.mainLearning,
      nextAdjustment: s.nextAdjustment,
      mentalState: s.mentalState,
      cancellationReason: s.cancellationReason,
    };
  }
}
