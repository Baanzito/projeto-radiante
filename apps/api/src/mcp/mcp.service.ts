import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { z } from 'zod/v4';
import { AuditService } from '../audit/audit.service';
import { LOCAL_USER_ID } from '../common/constants/local-user';
import { DashboardService } from '../dashboard/dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly server = new McpServer({
    name: 'projeto-radiante',
    version: '0.6.0',
  });
  private readonly transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  private readonly accessToken?: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService,
  ) {
    this.accessToken =
      config.get<string>('MCP_ACCESS_TOKEN')?.trim() || undefined;
    this.registerTools();
  }

  async onModuleInit() {
    await this.server.connect(this.transport);
  }

  status() {
    return {
      enabled: true,
      mode: 'READ_ONLY' as const,
      endpoint: 'http://127.0.0.1:3000/api/v1/mcp',
      tokenConfigured: Boolean(this.accessToken),
      tools: [
        'consultar_perfil',
        'consultar_semana_atual',
        'consultar_dashboard',
        'consultar_partidas_recentes',
        'consultar_feedbacks_coach',
        'consultar_revisoes_semanais',
      ],
    };
  }

  authorized(header?: string) {
    if (!this.accessToken) return true;
    return header === `Bearer ${this.accessToken}`;
  }

  handle(req: Request, res: Response) {
    return this.transport.handleRequest(req, res, req.body);
  }

  private registerTools() {
    const readOnly = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    this.server.registerTool(
      'consultar_perfil',
      {
        title: 'Consultar perfil',
        description: 'Lê o perfil e o ciclo ativo.',
        annotations: readOnly,
      },
      async () =>
        this.result(
          'consultar_perfil',
          await this.prisma.user.findUnique({
            where: { id: LOCAL_USER_ID },
            include: {
              profile: true,
              trainingCycles: {
                where: { status: 'ACTIVE' },
                include: { focuses: { include: { focusArea: true } } },
              },
            },
          }),
        ),
    );
    this.server.registerTool(
      'consultar_semana_atual',
      {
        title: 'Consultar semana atual',
        description: 'Lê o planejamento mais recente e seus blocos.',
        annotations: readOnly,
      },
      async () =>
        this.result(
          'consultar_semana_atual',
          await this.prisma.weeklyPlan.findFirst({
            where: { userId: LOCAL_USER_ID },
            include: { blocks: { orderBy: { plannedStart: 'asc' } } },
            orderBy: { weekStart: 'desc' },
          }),
        ),
    );
    this.server.registerTool(
      'consultar_dashboard',
      {
        title: 'Consultar dashboard',
        description:
          'Lê aderência, resultados e métricas de processo da semana.',
        annotations: readOnly,
      },
      async () =>
        this.result('consultar_dashboard', await this.dashboard.summary()),
    );
    this.server.registerTool(
      'consultar_partidas_recentes',
      {
        title: 'Consultar partidas recentes',
        description: 'Lê até 50 partidas recentes com suas reflexões.',
        inputSchema: { limite: z.number().int().min(1).max(50).default(10) },
        annotations: readOnly,
      },
      async ({ limite }) =>
        this.result(
          'consultar_partidas_recentes',
          await this.prisma.match.findMany({
            where: { userId: LOCAL_USER_ID },
            include: { reflection: true },
            orderBy: { startedAt: 'desc' },
            take: limite,
          }),
        ),
    );
    this.server.registerTool(
      'consultar_feedbacks_coach',
      {
        title: 'Consultar feedbacks do coach',
        description: 'Lê feedbacks do coach e seus estados.',
        annotations: readOnly,
      },
      async () =>
        this.result(
          'consultar_feedbacks_coach',
          await this.prisma.coachFeedback.findMany({
            where: { userId: LOCAL_USER_ID },
            include: { coachSession: true, focusArea: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
        ),
    );
    this.server.registerTool(
      'consultar_revisoes_semanais',
      {
        title: 'Consultar revisões semanais',
        description: 'Lê as revisões semanais mais recentes.',
        annotations: readOnly,
      },
      async () =>
        this.result(
          'consultar_revisoes_semanais',
          await this.prisma.weeklyReview.findMany({
            where: { userId: LOCAL_USER_ID },
            include: { weeklyPlan: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
        ),
    );
  }

  private async result(tool: string, value: unknown) {
    await this.audit.record({
      actor: 'MCP',
      action: 'MCP_READ',
      entityType: 'McpTool',
      summary: `Consulta somente leitura executada: ${tool}.`,
      metadata: { tool },
    });
    const serialized = JSON.parse(JSON.stringify(value)) as Record<
      string,
      unknown
    >;
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(serialized) }],
      structuredContent: serialized,
    };
  }
}
