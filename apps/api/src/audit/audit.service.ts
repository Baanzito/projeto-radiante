import { Injectable } from '@nestjs/common';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import type { AuditActor, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditListQueryDto } from './audit.dto';

export interface AuditInput {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditInput) {
    return this.prisma.auditEvent.create({
      data: {
        userId: LOCAL_USER_ID,
        ...input,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  list(query: AuditListQueryDto) {
    return this.prisma.auditEvent.findMany({
      where: {
        userId: LOCAL_USER_ID,
        ...(query.actor ? { actor: query.actor } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
  }
}
