import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateTrainingCycleDto } from './dto/activate-training-cycle.dto';
import { CompleteTrainingCycleDto } from './dto/complete-training-cycle.dto';
import {
  CreateTrainingCycleDto,
  CycleFocusInputDto,
} from './dto/create-training-cycle.dto';
import {
  CycleConclusionValue,
  CycleStatusValue,
  FocusPriorityValue,
  TrainingCycleResponseDto,
} from './dto/training-cycle-response.dto';
import { UpdateTrainingCycleDto } from './dto/update-training-cycle.dto';
import { ReuseTrainingCycleDto } from './dto/reuse-training-cycle.dto';

const cycleInclude = {
  focuses: {
    orderBy: { priority: 'asc' as const },
    include: { focusArea: true },
  },
};

interface StoredCycleFocus {
  focusAreaId: string;
  priority: FocusPriorityValue;
  successCriteria: string;
  focusArea: { name: string; active: boolean };
}

interface CycleRecord {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: CycleStatusValue;
  conclusion: CycleConclusionValue | null;
  conclusionNotes: string | null;
  focuses: StoredCycleFocus[];
}

@Injectable()
export class TrainingCyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TrainingCycleResponseDto[]> {
    const cycles = (await this.prisma.trainingCycle.findMany({
      where: { userId: LOCAL_USER_ID },
      include: cycleInclude,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })) as unknown as CycleRecord[];
    return cycles.map((cycle) => this.map(cycle));
  }

  async get(id: string): Promise<TrainingCycleResponseDto> {
    const cycle = await this.findOwnedCycle(id);
    return this.map(cycle);
  }

  async create(
    input: CreateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    await this.validateFocuses(input.focuses);
    const startDate = this.parseDate(input.startDate);
    const endDate = this.calculateEndDate(startDate, input.durationDays);

    const cycle = (await this.prisma.trainingCycle.create({
      data: {
        userId: LOCAL_USER_ID,
        name: input.name.trim(),
        startDate,
        endDate,
        focuses: {
          create: input.focuses.map((focus) => ({
            focusAreaId: focus.focusAreaId,
            priority: focus.priority,
            successCriteria: focus.successCriteria.trim(),
          })),
        },
      },
      include: cycleInclude,
    })) as unknown as CycleRecord;

    return this.map(cycle);
  }

  async update(
    id: string,
    input: UpdateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    const current = await this.findOwnedCycle(id);
    if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
      throw new ConflictException('Um ciclo encerrado não pode ser alterado.');
    }

    if (input.focuses) {
      await this.validateFocuses(input.focuses);
    }

    const startDate = input.startDate
      ? this.parseDate(input.startDate)
      : current.startDate;
    const durationDays = input.durationDays ?? this.durationInDays(current);
    const endDate = this.calculateEndDate(startDate, durationDays);

    const cycle = (await this.prisma.$transaction(async (tx) => {
      if (input.focuses) {
        await tx.cycleFocus.deleteMany({ where: { cycleId: id } });
      }

      return tx.trainingCycle.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          startDate,
          endDate,
          ...(input.focuses
            ? {
                focuses: {
                  create: input.focuses.map((focus) => ({
                    focusAreaId: focus.focusAreaId,
                    priority: focus.priority,
                    successCriteria: focus.successCriteria.trim(),
                  })),
                },
              }
            : {}),
        },
        include: cycleInclude,
      });
    })) as unknown as CycleRecord;

    return this.map(cycle);
  }

  async activate(
    id: string,
    input: ActivateTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    try {
      const result = (await this.prisma.$transaction(async (tx) => {
        const candidate = await tx.trainingCycle.findFirst({
          where: { id, userId: LOCAL_USER_ID },
          include: cycleInclude,
        });

        if (!candidate) {
          throw new NotFoundException('Ciclo de treino não encontrado.');
        }
        if (candidate.status !== 'DRAFT') {
          throw new ConflictException(
            'Somente um ciclo em rascunho pode ser ativado.',
          );
        }
        this.assertStoredFocuses(candidate.focuses);

        const active = await tx.trainingCycle.findFirst({
          where: { userId: LOCAL_USER_ID, status: 'ACTIVE' },
          select: { id: true, name: true },
        });

        if (active && !input.replaceActive) {
          throw new ConflictException({
            message: 'Já existe um ciclo ativo.',
            activeCycleId: active.id,
            activeCycleName: active.name,
          });
        }

        if (active) {
          await tx.trainingCycle.update({
            where: { id: active.id },
            data: { status: 'CANCELLED' },
          });
        }

        return tx.trainingCycle.update({
          where: { id },
          data: { status: 'ACTIVE' },
          include: cycleInclude,
        });
      })) as unknown as CycleRecord;

      return this.map(result);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Já existe um ciclo ativo.');
      }
      throw error;
    }
  }

  async complete(
    id: string,
    input: CompleteTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    const current = await this.findOwnedCycle(id);
    if (current.status !== 'ACTIVE') {
      throw new ConflictException('Somente o ciclo ativo pode ser concluído.');
    }

    const cycle = (await this.prisma.trainingCycle.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        conclusion: input.conclusion,
        conclusionNotes: input.conclusionNotes?.trim() || null,
      },
      include: cycleInclude,
    })) as unknown as CycleRecord;
    return this.map(cycle);
  }

  async reuse(
    id: string,
    input: ReuseTrainingCycleDto,
  ): Promise<TrainingCycleResponseDto> {
    const source = await this.findOwnedCycle(id);
    if (source.status !== 'COMPLETED' && source.status !== 'CANCELLED') {
      throw new ConflictException(
        'Somente ciclos concluídos ou cancelados podem ser reutilizados.',
      );
    }

    this.assertStoredFocuses(source.focuses);
    const startDate = this.parseDate(input.startDate);
    const endDate = this.calculateEndDate(
      startDate,
      this.durationInDays(source),
    );

    const copy = (await this.prisma.trainingCycle.create({
      data: {
        userId: LOCAL_USER_ID,
        name: input.name.trim(),
        startDate,
        endDate,
        status: 'DRAFT',
        focuses: {
          create: source.focuses.map((focus) => ({
            focusAreaId: focus.focusAreaId,
            priority: focus.priority,
            successCriteria: focus.successCriteria,
          })),
        },
      },
      include: cycleInclude,
    })) as unknown as CycleRecord;

    return this.map(copy);
  }

  private async validateFocuses(focuses: CycleFocusInputDto[]): Promise<void> {
    this.assertFocusPriorities(focuses);

    const ids = focuses.map((focus) => focus.focusAreaId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Uma área de foco não pode se repetir no ciclo.',
      );
    }

    const ownedActiveCount = await this.prisma.focusArea.count({
      where: { id: { in: ids }, userId: LOCAL_USER_ID, active: true },
    });
    if (ownedActiveCount !== ids.length) {
      throw new BadRequestException(
        'Todos os focos do ciclo devem existir e estar ativos.',
      );
    }
  }

  private assertStoredFocuses(focuses: StoredCycleFocus[]): void {
    this.assertFocusPriorities(
      focuses.map((focus) => ({
        focusAreaId: '',
        priority: focus.priority,
        successCriteria: '',
      })),
    );
    if (focuses.some((focus) => !focus.focusArea.active)) {
      throw new BadRequestException(
        'Reative os focos do ciclo antes de ativá-lo.',
      );
    }
  }

  private assertFocusPriorities(
    focuses: Array<{ priority: FocusPriorityValue }>,
  ): void {
    const primaryCount = focuses.filter(
      (focus) => focus.priority === 'PRIMARY',
    ).length;
    const secondaryCount = focuses.filter(
      (focus) => focus.priority === 'SECONDARY',
    ).length;

    if (primaryCount !== 1) {
      throw new BadRequestException(
        'O ciclo deve possuir exatamente um foco principal.',
      );
    }
    if (secondaryCount > 2) {
      throw new BadRequestException(
        'O ciclo pode possuir no máximo dois focos secundários.',
      );
    }
  }

  private async findOwnedCycle(id: string): Promise<CycleRecord> {
    const cycle = (await this.prisma.trainingCycle.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include: cycleInclude,
    })) as unknown as CycleRecord | null;
    if (!cycle) {
      throw new NotFoundException('Ciclo de treino não encontrado.');
    }
    return cycle;
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Data inicial inválida.');
    }
    return date;
  }

  private calculateEndDate(startDate: Date, durationDays: number): Date {
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);
    return endDate;
  }

  private durationInDays(cycle: {
    startDate: Date;
    endDate: Date;
  }): 7 | 14 | 30 {
    const value =
      Math.round(
        (cycle.endDate.getTime() - cycle.startDate.getTime()) / 86_400_000,
      ) + 1;
    if (value !== 7 && value !== 14 && value !== 30) {
      throw new BadRequestException(
        'A duração atual do ciclo não é suportada.',
      );
    }
    return value;
  }

  private map(cycle: CycleRecord): TrainingCycleResponseDto {
    return {
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate.toISOString().slice(0, 10),
      endDate: cycle.endDate.toISOString().slice(0, 10),
      durationDays: this.durationInDays(cycle),
      status: cycle.status,
      conclusion: cycle.conclusion,
      conclusionNotes: cycle.conclusionNotes,
      focuses: cycle.focuses.map((focus) => ({
        focusAreaId: focus.focusAreaId,
        name: focus.focusArea.name,
        priority: focus.priority,
        successCriteria: focus.successCriteria,
      })),
    };
  }
}
