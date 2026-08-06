import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FocusAreasService } from './focus-areas.service';

describe('FocusAreasService', () => {
  const area = {
    id: '30000000-0000-4000-8000-000000000001',
    userId: '11111111-1111-4111-8111-111111111111',
    name: 'Tomada de decisão rápida',
    category: 'DECISION',
    observableBehavior: 'Escolher e executar a prioridade.',
    active: true,
  };

  it('lists only active areas by default', async () => {
    const findMany = jest.fn().mockResolvedValue([area]);
    const service = new FocusAreasService({
      focusArea: { findMany },
    } as unknown as PrismaService);

    await expect(service.list()).resolves.toMatchObject([
      { name: area.name, active: true },
    ]);
    const calls = findMany.mock.calls as unknown as Array<
      [{ where: { active: boolean } }]
    >;
    expect(calls[0][0].where.active).toBe(true);
  });

  it('maps duplicate names to a domain conflict', async () => {
    const service = new FocusAreasService({
      focusArea: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    } as unknown as PrismaService);

    await expect(
      service.create({
        name: area.name,
        category: 'DECISION',
        observableBehavior: area.observableBehavior,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not update an area outside the local user', async () => {
    const service = new FocusAreasService({
      focusArea: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);

    await expect(
      service.update(area.id, { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
