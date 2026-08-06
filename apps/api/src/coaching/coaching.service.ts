import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConvertFeedbackToFocusDto,
  CreateCoachFeedbackDto,
  CreateCoachSessionDto,
  UpdateCoachFeedbackDto,
  UpdateCoachSessionDto,
} from './coaching.dto';

const sessionInclude = {
  feedbacks: {
    include: { focusArea: { select: { id: true, name: true } } },
    orderBy: [{ priority: 'desc' as const }, { createdAt: 'asc' as const }],
  },
};

@Injectable()
export class CoachingService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.coachSession.findMany({
      where: { userId: LOCAL_USER_ID },
      include: sessionInclude,
      orderBy: { heldAt: 'desc' },
    });
  }

  async get(id: string) {
    const session = await this.prisma.coachSession.findFirst({
      where: { id, userId: LOCAL_USER_ID },
      include: sessionInclude,
    });
    if (!session)
      throw new NotFoundException('Aula de coaching não encontrada.');
    return session;
  }

  async create(input: CreateCoachSessionDto) {
    const heldAt = new Date(input.heldAt);
    if (Number.isNaN(heldAt.valueOf()))
      throw new BadRequestException('Data da aula inválida.');
    return this.prisma.coachSession.create({
      data: {
        userId: LOCAL_USER_ID,
        coachName: input.coachName.trim(),
        heldAt,
        durationMinutes: input.durationMinutes,
        summary: input.summary.trim(),
      },
      include: sessionInclude,
    });
  }

  async update(id: string, input: UpdateCoachSessionDto) {
    await this.get(id);
    return this.prisma.coachSession.update({
      where: { id },
      data: {
        ...(input.coachName !== undefined
          ? { coachName: input.coachName.trim() }
          : {}),
        ...(input.heldAt ? { heldAt: new Date(input.heldAt) } : {}),
        ...(input.durationMinutes !== undefined
          ? { durationMinutes: input.durationMinutes }
          : {}),
        ...(input.summary !== undefined
          ? { summary: input.summary.trim() }
          : {}),
      },
      include: sessionInclude,
    });
  }

  async addFeedback(sessionId: string, input: CreateCoachFeedbackDto) {
    await this.get(sessionId);
    if (input.focusAreaId) await this.assertFocus(input.focusAreaId);
    return this.prisma.coachFeedback.create({
      data: {
        coachSessionId: sessionId,
        userId: LOCAL_USER_ID,
        category: input.category,
        priority: input.priority,
        feedbackText: input.feedbackText.trim(),
        evidence: input.evidence?.trim() || null,
        suggestedAction: input.suggestedAction?.trim() || null,
        focusAreaId: input.focusAreaId || null,
      },
      include: { focusArea: { select: { id: true, name: true } } },
    });
  }

  async updateFeedback(id: string, input: UpdateCoachFeedbackDto) {
    await this.feedback(id);
    if (input.focusAreaId) await this.assertFocus(input.focusAreaId);
    return this.prisma.coachFeedback.update({
      where: { id },
      data: {
        ...(input.category ? { category: input.category } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.feedbackText !== undefined
          ? { feedbackText: input.feedbackText.trim() }
          : {}),
        ...(input.evidence !== undefined
          ? { evidence: input.evidence?.trim() || null }
          : {}),
        ...(input.suggestedAction !== undefined
          ? { suggestedAction: input.suggestedAction?.trim() || null }
          : {}),
        ...(input.focusAreaId !== undefined
          ? { focusAreaId: input.focusAreaId || null }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: { focusArea: { select: { id: true, name: true } } },
    });
  }

  async convertToFocus(id: string, input: ConvertFeedbackToFocusDto) {
    const feedback = await this.feedback(id);
    if (feedback.focusAreaId) {
      throw new ConflictException(
        'Este feedback já está ligado a uma área de foco.',
      );
    }
    if (input.focusAreaId) {
      await this.assertFocus(input.focusAreaId);
      return this.prisma.coachFeedback.update({
        where: { id },
        data: { focusAreaId: input.focusAreaId, status: 'IN_PROGRESS' },
        include: { focusArea: { select: { id: true, name: true } } },
      });
    }
    if (!input.name?.trim() || !input.observableBehavior?.trim()) {
      throw new BadRequestException(
        'Informe nome e comportamento observável para o novo foco.',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const focus = await tx.focusArea.create({
          data: {
            userId: LOCAL_USER_ID,
            name: input.name!.trim(),
            category: feedback.category,
            observableBehavior: input.observableBehavior!.trim(),
          },
        });
        return tx.coachFeedback.update({
          where: { id },
          data: { focusAreaId: focus.id, status: 'IN_PROGRESS' },
          include: { focusArea: { select: { id: true, name: true } } },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'Já existe uma área de foco com esse nome.',
        );
      }
      throw error;
    }
  }

  private async feedback(id: string) {
    const feedback = await this.prisma.coachFeedback.findFirst({
      where: { id, userId: LOCAL_USER_ID },
    });
    if (!feedback)
      throw new NotFoundException('Feedback de coaching não encontrado.');
    return feedback;
  }

  private async assertFocus(id: string) {
    const focus = await this.prisma.focusArea.findFirst({
      where: { id, userId: LOCAL_USER_ID, active: true },
    });
    if (!focus)
      throw new BadRequestException('Selecione uma área de foco ativa.');
  }
}
