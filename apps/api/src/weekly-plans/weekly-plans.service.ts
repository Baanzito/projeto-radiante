import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelBlockDto,
  CreateBlockDto,
  CreateWeeklyPlanDto,
  UpdateBlockDto,
  UpdateWeeklyPlanDto,
} from './weekly-plans.dto';

const include = {
  blocks: {
    orderBy: { plannedStart: 'asc' as const },
    include: {
      focusArea: { select: { name: true } },
      session: { select: { id: true } },
    },
  },
};
type Plan = any;
@Injectable()
export class WeeklyPlansService {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    return (
      await this.prisma.weeklyPlan.findMany({
        where: { userId: LOCAL_USER_ID },
        include,
        orderBy: { weekStart: 'desc' },
      })
    ).map((p) => this.map(p));
  }
  async get(id: string) {
    return this.map(await this.plan(id));
  }
  async create(input: CreateWeeklyPlanDto) {
    const start = new Date(`${input.weekStart}T00:00:00.000Z`);
    if (Number.isNaN(+start) || start.getUTCDay() !== 1)
      throw new BadRequestException(
        'A semana deve começar em uma segunda-feira válida.',
      );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId: LOCAL_USER_ID },
    });
    if (!profile) throw new NotFoundException('Perfil local não encontrado.');
    const min = input.rankedTargetMin ?? profile.weeklyRankedMin,
      max = input.rankedTargetMax ?? profile.weeklyRankedMax;
    this.targets(min, max);
    try {
      return this.map(
        await this.prisma.weeklyPlan.create({
          data: {
            userId: LOCAL_USER_ID,
            weekStart: start,
            weekEnd: end,
            rankedTargetMin: min,
            rankedTargetMax: max,
            weeklyIntent: input.weeklyIntent?.trim() ?? '',
          },
          include,
        }),
      );
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'Já existe um planejamento para esta semana.',
        );
      throw e;
    }
  }
  async update(id: string, input: UpdateWeeklyPlanDto) {
    const p = await this.plan(id);
    this.editable(p);
    const min = input.rankedTargetMin ?? p.rankedTargetMin,
      max = input.rankedTargetMax ?? p.rankedTargetMax;
    this.targets(min, max);
    const nextStart = input.weekStart
      ? this.parseWeekStart(input.weekStart)
      : p.weekStart;
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 6);
    const shiftMs = nextStart.valueOf() - p.weekStart.valueOf();
    try {
      return this.map(
        await this.prisma.$transaction(async (tx) => {
          if (shiftMs !== 0) {
            for (const block of p.blocks) {
              await tx.routineBlock.update({
                where: { id: block.id },
                data: {
                  plannedStart: new Date(
                    block.plannedStart.valueOf() + shiftMs,
                  ),
                  plannedEnd: new Date(block.plannedEnd.valueOf() + shiftMs),
                },
              });
            }
          }
          return tx.weeklyPlan.update({
            where: { id },
            data: {
              weekStart: nextStart,
              weekEnd: nextEnd,
              rankedTargetMin: min,
              rankedTargetMax: max,
              ...(input.weeklyIntent !== undefined
                ? { weeklyIntent: input.weeklyIntent.trim() }
                : {}),
            },
            include,
          });
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'Já existe um planejamento para esta semana.',
        );
      }
      throw error;
    }
  }
  async confirm(id: string) {
    const p = await this.plan(id);
    this.draft(p);
    if (!p.blocks.length)
      throw new ConflictException(
        'Adicione ao menos um bloco antes de confirmar a semana.',
      );
    return this.map(
      await this.prisma.$transaction(async (tx) => {
        await tx.routineBlock.updateMany({
          where: { weeklyPlanId: id, status: 'DRAFT' },
          data: { status: 'CONFIRMED' },
        });
        return tx.weeklyPlan.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include,
        });
      }),
    );
  }
  async close(id: string) {
    const p = await this.plan(id);
    if (
      p.status !== 'CONFIRMED' ||
      p.blocks.some((b: any) => !['COMPLETED', 'CANCELLED'].includes(b.status))
    )
      throw new ConflictException(
        'Conclua ou cancele todos os blocos antes de encerrar a semana.',
      );
    return this.map(
      await this.prisma.weeklyPlan.update({
        where: { id },
        data: { status: 'CLOSED' },
        include,
      }),
    );
  }
  async createBlock(planId: string, input: CreateBlockDto) {
    const p = await this.plan(planId);
    this.editable(p);
    const { start, end } = await this.interval(p, input);
    const b = await this.prisma.routineBlock.create({
      data: {
        weeklyPlanId: planId,
        userId: LOCAL_USER_ID,
        type: input.type,
        status: p.status === 'CONFIRMED' ? 'CONFIRMED' : 'DRAFT',
        title: input.title.trim(),
        plannedStart: start,
        plannedEnd: end,
        focusAreaId: input.focusAreaId || null,
        notes: input.notes?.trim() || null,
      },
    });
    return (await this.get(planId)).blocks.find((x: any) => x.id === b.id);
  }
  async updateBlock(id: string, input: UpdateBlockDto) {
    const b = await this.block(id),
      p = await this.plan(b.weeklyPlanId);
    this.editable(p);
    const merged = {
      type: input.type ?? b.type,
      title: input.title ?? b.title,
      plannedStart: input.plannedStart ?? b.plannedStart.toISOString(),
      plannedEnd: input.plannedEnd ?? b.plannedEnd.toISOString(),
      focusAreaId:
        input.focusAreaId === undefined ? b.focusAreaId : input.focusAreaId,
      notes: input.notes === undefined ? b.notes : input.notes,
    };
    const { start, end } = await this.interval(p, merged as CreateBlockDto);
    await this.prisma.routineBlock.update({
      where: { id },
      data: {
        ...merged,
        plannedStart: start,
        plannedEnd: end,
        focusAreaId: merged.focusAreaId || null,
        notes: merged.notes?.trim() || null,
      },
    });
    return (await this.get(p.id)).blocks.find((x: any) => x.id === id);
  }
  async deleteBlock(id: string) {
    const b = await this.block(id),
      p = await this.plan(b.weeklyPlanId);
    this.editable(p);
    if (b.session)
      throw new ConflictException('Um bloco com sessão não pode ser excluído.');
    await this.prisma.routineBlock.delete({ where: { id } });
  }
  async cancelBlock(id: string, input: CancelBlockDto) {
    const b = await this.block(id);
    if (['COMPLETED', 'CANCELLED'].includes(b.status))
      throw new ConflictException('Este bloco já está encerrado.');
    const active = await this.prisma.trainingSession.findFirst({
      where: { plannedBlockId: id, status: { in: ['IN_PROGRESS', 'PAUSED'] } },
    });
    if (active)
      throw new ConflictException(
        'Cancele a sessão ativa antes de cancelar o bloco.',
      );
    await this.prisma.routineBlock.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: input.reason?.trim() || null,
      },
    });
    return (await this.get(b.weeklyPlanId)).blocks.find(
      (x: any) => x.id === id,
    );
  }
  private async plan(id: string): Promise<Plan> {
    const p = await this.prisma.weeklyPlan.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include,
    });
    if (!p) throw new NotFoundException('Planejamento semanal não encontrado.');
    return p;
  }
  private async block(id: string): Promise<any> {
    const b = await this.prisma.routineBlock.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include: { session: true },
    });
    if (!b) throw new NotFoundException('Bloco de rotina não encontrado.');
    return b;
  }
  private draft(p: Plan) {
    if (p.status !== 'DRAFT')
      throw new ConflictException(
        'Somente uma semana em rascunho pode ser alterada.',
      );
  }
  private editable(p: Plan) {
    if (p.status === 'CLOSED') {
      throw new ConflictException(
        'Uma semana encerrada não pode mais ser alterada.',
      );
    }
  }
  private parseWeekStart(value: string) {
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(+start) || start.getUTCDay() !== 1) {
      throw new BadRequestException(
        'A semana deve começar em uma segunda-feira válida.',
      );
    }
    return start;
  }
  private targets(min: number, max: number) {
    if (min > max)
      throw new BadRequestException('A meta mínima não pode superar a máxima.');
  }
  private async interval(p: Plan, input: CreateBlockDto) {
    const start = new Date(input.plannedStart),
      end = new Date(input.plannedEnd);
    if (Number.isNaN(+start) || end <= start)
      throw new BadRequestException(
        'O fim do bloco deve ser posterior ao início.',
      );
    const tz =
      (
        await this.prisma.user.findUnique({
          where: { id: LOCAL_USER_ID },
          select: { timezone: true },
        })
      )?.timezone ?? 'America/Sao_Paulo';
    const date = (v: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(v);
    if (date(start) < this.day(p.weekStart) || date(end) > this.day(p.weekEnd))
      throw new BadRequestException(
        'O bloco precisa estar dentro da semana planejada.',
      );
    if (
      input.focusAreaId &&
      !(await this.prisma.focusArea.findFirst({
        where: { id: input.focusAreaId, userId: LOCAL_USER_ID, active: true },
      }))
    )
      throw new BadRequestException('Selecione uma área de foco ativa.');
    return { start, end };
  }
  private map(p: Plan) {
    return {
      id: p.id,
      weekStart: this.day(p.weekStart),
      weekEnd: this.day(p.weekEnd),
      status: p.status,
      rankedTargetMin: p.rankedTargetMin,
      rankedTargetMax: p.rankedTargetMax,
      weeklyIntent: p.weeklyIntent,
      blocks: p.blocks.map((b: any) => ({
        ...b,
        plannedStart: b.plannedStart.toISOString(),
        plannedEnd: b.plannedEnd.toISOString(),
        focusAreaName: b.focusArea?.name ?? null,
        sessionId: b.session?.id ?? null,
        conflicts: p.blocks
          .filter(
            (o: any) =>
              o.id !== b.id &&
              o.status !== 'CANCELLED' &&
              b.status !== 'CANCELLED' &&
              o.plannedStart < b.plannedEnd &&
              o.plannedEnd > b.plannedStart,
          )
          .map((o: any) => ({
            blockId: o.id,
            title: o.title,
            plannedStart: o.plannedStart.toISOString(),
            plannedEnd: o.plannedEnd.toISOString(),
          })),
      })),
    };
  }
  private day(v: Date) {
    return v.toISOString().slice(0, 10);
  }
}
