import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFocusAreaDto } from './dto/create-focus-area.dto';
import {
  FocusAreaResponseDto,
  FocusCategoryValue,
} from './dto/focus-area-response.dto';
import { UpdateFocusAreaDto } from './dto/update-focus-area.dto';

@Injectable()
export class FocusAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false): Promise<FocusAreaResponseDto[]> {
    const areas = await this.prisma.focusArea.findMany({
      where: {
        userId: LOCAL_USER_ID,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return areas.map((area) => this.map(area));
  }

  async create(input: CreateFocusAreaDto): Promise<FocusAreaResponseDto> {
    try {
      const area = await this.prisma.focusArea.create({
        data: {
          userId: LOCAL_USER_ID,
          name: input.name.trim(),
          category: input.category,
          observableBehavior: input.observableBehavior.trim(),
        },
      });
      return this.map(area);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(
          'Já existe uma área de foco com esse nome.',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateFocusAreaDto,
  ): Promise<FocusAreaResponseDto> {
    const existing = await this.prisma.focusArea.findFirst({
      where: { id, userId: LOCAL_USER_ID },
    });

    if (!existing) {
      throw new NotFoundException('Área de foco não encontrada.');
    }

    try {
      const area = await this.prisma.focusArea.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.observableBehavior !== undefined
            ? { observableBehavior: input.observableBehavior.trim() }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      return this.map(area);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(
          'Já existe uma área de foco com esse nome.',
        );
      }
      throw error;
    }
  }

  private map(area: {
    id: string;
    name: string;
    category: string;
    observableBehavior: string;
    active: boolean;
  }): FocusAreaResponseDto {
    return {
      id: area.id,
      name: area.name,
      category: area.category as FocusCategoryValue,
      observableBehavior: area.observableBehavior,
      active: area.active,
    };
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (error as { code?: string }).code === 'P2002';
  }
}
