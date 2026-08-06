import { Injectable, NotFoundException } from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponseDto } from './dto/profile-response.dto';

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

    const activeCycle = user.trainingCycles[0];

    return {
      id: user.id,
      displayName: user.displayName,
      timezone: user.timezone,
      currentRank: user.profile.currentRank,
      currentRr: user.profile.currentRr,
      sensitivity: Number(user.profile.sensitivity),
      dpi: user.profile.dpi,
      weeklyRankedMin: user.profile.weeklyRankedMin,
      weeklyRankedMax: user.profile.weeklyRankedMax,
      primaryGoal: user.profile.primaryGoal,
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
}
