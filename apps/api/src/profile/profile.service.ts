import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface ProfileUserRecord {
  id: string;
  displayName: string;
  timezone: string;
  profile: {
    currentRank: string;
    currentRr: number | null;
    peakRank: string | null;
    valorantName: string | null;
    valorantTag: string | null;
    sensitivity: unknown;
    dpi: number;
    weeklyRankedMin: number;
    weeklyRankedMax: number;
    primaryGoal: string;
    defaultSessionStart: Date | null;
    defaultSessionEnd: Date | null;
  };
  trainingCycles: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    focuses: Array<{
      priority: 'PRIMARY' | 'SECONDARY';
      successCriteria: string;
      focusArea: { name: string };
    }>;
  }>;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getLocalProfile(): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: LOCAL_USER_ID },
      include: {
        profile: true,
        trainingCycles: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          include: {
            focuses: {
              orderBy: { priority: 'asc' },
              include: { focusArea: true },
            },
          },
        },
      },
    });

    if (!user?.profile) {
      throw new NotFoundException(
        'Perfil local não encontrado. Execute pnpm run db:seed.',
      );
    }

    return this.mapProfile(user as unknown as ProfileUserRecord);
  }

  async updateLocalProfile(
    input: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    if (input.weeklyRankedMax < input.weeklyRankedMin) {
      throw new BadRequestException(
        'A meta máxima de rankeds deve ser maior ou igual à mínima.',
      );
    }

    if (!this.isValidTimezone(input.timezone)) {
      throw new BadRequestException('Timezone inválido.');
    }

    if (
      input.defaultSessionStart &&
      input.defaultSessionEnd &&
      input.defaultSessionEnd <= input.defaultSessionStart
    ) {
      throw new BadRequestException(
        'O fim da sessão padrão deve ser posterior ao início.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: LOCAL_USER_ID },
      select: { profile: { select: { userId: true } } },
    });

    if (!existing?.profile) {
      throw new NotFoundException(
        'Perfil local não encontrado. Execute pnpm run db:seed.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: LOCAL_USER_ID },
        data: {
          displayName: input.displayName.trim(),
          timezone: input.timezone,
        },
      }),
      this.prisma.playerProfile.update({
        where: { userId: LOCAL_USER_ID },
        data: {
          currentRank: input.currentRank.trim(),
          currentRr: input.currentRr,
          peakRank: this.nullIfBlank(input.peakRank),
          valorantName: this.nullIfBlank(input.valorantName),
          valorantTag: this.nullIfBlank(input.valorantTag),
          sensitivity: input.sensitivity,
          dpi: input.dpi,
          weeklyRankedMin: input.weeklyRankedMin,
          weeklyRankedMax: input.weeklyRankedMax,
          primaryGoal: input.primaryGoal.trim(),
          defaultSessionStart: this.toTime(input.defaultSessionStart),
          defaultSessionEnd: this.toTime(input.defaultSessionEnd),
        },
      }),
    ]);

    return this.getLocalProfile();
  }

  private mapProfile(user: ProfileUserRecord): ProfileResponseDto {
    const activeCycle = user.trainingCycles[0];

    return {
      id: user.id,
      displayName: user.displayName,
      timezone: user.timezone,
      currentRank: user.profile.currentRank,
      currentRr: user.profile.currentRr,
      peakRank: user.profile.peakRank,
      valorantName: user.profile.valorantName,
      valorantTag: user.profile.valorantTag,
      sensitivity: Number(user.profile.sensitivity),
      dpi: user.profile.dpi,
      weeklyRankedMin: user.profile.weeklyRankedMin,
      weeklyRankedMax: user.profile.weeklyRankedMax,
      primaryGoal: user.profile.primaryGoal,
      defaultSessionStart: this.fromTime(user.profile.defaultSessionStart),
      defaultSessionEnd: this.fromTime(user.profile.defaultSessionEnd),
      activeCycle: activeCycle
        ? {
            id: activeCycle.id,
            name: activeCycle.name,
            startDate: activeCycle.startDate.toISOString().slice(0, 10),
            endDate: activeCycle.endDate.toISOString().slice(0, 10),
            focuses: activeCycle.focuses.map((focus) => ({
              name: focus.focusArea.name,
              priority: focus.priority,
              successCriteria: focus.successCriteria,
            })),
          }
        : null,
    };
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }

  private nullIfBlank(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toTime(value: string | null): Date | null {
    return value ? new Date(`1970-01-01T${value}:00.000Z`) : null;
  }

  private fromTime(value: Date | null): string | null {
    return value ? value.toISOString().slice(11, 16) : null;
  }
}
