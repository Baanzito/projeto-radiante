import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let http: HttpTestingController;

  const profile = {
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Diego',
    timezone: 'America/Sao_Paulo',
    currentRank: 'Ascendente 2',
    currentRr: 42,
    peakRank: null,
    valorantName: 'Baanzito',
    valorantTag: 'BR1',
    sensitivity: 0.179,
    dpi: 3200,
    weeklyRankedMin: 10,
    weeklyRankedMax: 14,
    primaryGoal: 'Atingir Radiant.',
    defaultSessionStart: '20:15',
    defaultSessionEnd: '22:45',
    activeCycle: null,
  };
  const emptyMatchSummary = {
    totalMatches: 0,
    linkedSessions: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: null,
    totalRr: 0,
    averageRr: null,
    averageKills: null,
    averageDeaths: null,
    averageAssists: null,
    kdRatio: null,
    averageAcs: null,
    averageHeadshotPct: null,
    averageFirstKills: null,
    averageFirstDeaths: null,
    reflectionCount: 0,
    averageDecisionClarity: null,
    averageCallResponse: null,
    averagePatternReading: null,
  };
  const emptyDashboardSummary = {
    week: {
      planId: null,
      weekStart: '2026-08-03',
      weekEnd: '2026-08-09',
      status: null,
      weeklyIntent: null,
    },
    adherence: {
      plannedMinutes: 0,
      completedMinutes: 0,
      timePercent: null,
      plannedBlocks: 0,
      completedBlocks: 0,
      consciousRankedCount: 0,
      rankedTargetMin: 0,
      rankedTargetMax: 0,
    },
    results: { matchCount: 0, wins: 0, losses: 0, rrDelta: 0 },
    process: {
      sampleSize: 0,
      decisionClarity: null,
      callResponse: null,
      patternReading: null,
      patternsRecognized: 0,
      adaptationsApplied: 0,
      repeatedPatterns: [],
    },
    coaching: { openFeedbackCount: 0, highPriorityCount: 0, latestPriorityFeedback: null },
    cycle: null,
    review: null,
  };
  const integrationsStatus = {
    openai: {
      configured: false,
      model: 'gpt-5.6-luna',
      provider: 'openai',
      storeResponses: false,
      writesRequireConfirmation: true,
    },
    googleCalendar: {
      configured: false,
      connected: false,
      status: 'DISCONNECTED',
      accountLabel: null,
      scopes: [],
      lastSyncedAt: null,
      direction: 'OUTBOUND_ONLY',
    },
    mcp: {
      enabled: true,
      mode: 'READ_ONLY',
      endpoint: '/api/v1/mcp',
      tokenConfigured: false,
      tools: ['consultar_perfil'],
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushWorkspace(
    cycles: unknown[] = [],
    plans: unknown[] = [],
    matches: unknown[] = [],
    matchSummary: object = emptyMatchSummary,
    dashboardSummary: object = emptyDashboardSummary,
    coachSessions: unknown[] = [],
    weeklyReviews: unknown[] = [],
  ): void {
    http.expectOne('/api/v1/auth/session').flush({
      enabled: false,
      authenticated: true,
      email: null,
    });
    http.expectOne('/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.7.0',
    });
    http.expectOne('/api/v1/profile').flush(profile);
    http.expectOne('/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('/api/v1/training-cycles').flush(cycles);
    http.expectOne('/api/v1/weekly-plans').flush(plans);
    http.expectOne('/api/v1/sessions/active').flush(null);
    http.expectOne('/api/v1/reflections/pending').flush([]);
    http
      .expectOne('/api/v1/matches?page=1&pageSize=20')
      .flush({ items: matches, total: matches.length, page: 1, pageSize: 20 });
    http.expectOne('/api/v1/matches/summary').flush(matchSummary);
    http.expectOne('/api/v1/coach-sessions').flush(coachSessions);
    http.expectOne('/api/v1/dashboard/summary').flush(dashboardSummary);
    http.expectOne('/api/v1/weekly-reviews').flush(weeklyReviews);
    http.expectOne('/api/v1/ai/recommendations').flush([]);
    http.expectOne('/api/v1/audit-events?limit=50').flush([]);
    http.expectOne('/api/v1/integrations/status').flush(integrationsStatus);
  }

  it('renders the complete Marco 1 workspace', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    flushWorkspace();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Ascendente 2');
    expect(element.textContent).toContain('10–14');
    expect(element.textContent).toContain('Criar ciclo');
    expect(element.textContent).toContain('Marco 6');
  });

  it('registers a match in the active session and offers the quick reflection', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const session = {
      id: 'session-id',
      plannedBlockId: null,
      plannedBlockTitle: null,
      focusAreaId: null,
      focusAreaName: null,
      type: 'RANKED',
      status: 'IN_PROGRESS',
      startedAt: '2026-08-06T20:00:00.000Z',
      endedAt: null,
      totalPausedSeconds: 0,
      elapsedSeconds: 300,
      preEnergy: 4,
      preFocus: 4,
    };

    http.expectOne('/api/v1/auth/session').flush({
      enabled: false,
      authenticated: true,
      email: null,
    });
    http.expectOne('/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.7.0',
    });
    http.expectOne('/api/v1/profile').flush(profile);
    http.expectOne('/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('/api/v1/training-cycles').flush([]);
    http.expectOne('/api/v1/weekly-plans').flush([]);
    http.expectOne('/api/v1/sessions/active').flush(session);
    http.expectOne('/api/v1/reflections/pending').flush([]);
    http
      .expectOne('/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http.expectOne('/api/v1/matches/summary').flush(emptyMatchSummary);
    http.expectOne('/api/v1/coach-sessions').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(emptyDashboardSummary);
    http.expectOne('/api/v1/weekly-reviews').flush([]);
    http.expectOne('/api/v1/ai/recommendations').flush([]);
    http.expectOne('/api/v1/audit-events?limit=50').flush([]);
    http.expectOne('/api/v1/integrations/status').flush(integrationsStatus);
    http
      .expectOne('/api/v1/matches?page=1&pageSize=100&sessionId=session-id')
      .flush({ items: [], total: 0, page: 1, pageSize: 100 });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Sessão'))
      ?.click();
    fixture.detectChanges();
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Adicionar partida'))
      ?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Nova partida');
    expect(element.textContent).toContain('Hora aproximada (24h)');
    expect(element.textContent).toContain('Adicionar estatísticas opcionais');
    expect(element.querySelector('input[name="kills"]')).toBeNull();

    const component = fixture.componentInstance as unknown as {
      matchDraft: { agentName: string; mapName: string };
    };
    component.matchDraft.agentName = 'Omen';
    component.matchDraft.mapName = 'Ascent';
    fixture.detectChanges();
    element.querySelector<HTMLFormElement>('form[aria-labelledby="match-title"]')?.requestSubmit();

    const create = http.expectOne('/api/v1/matches');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toMatchObject({
      sessionId: 'session-id',
      agentName: 'Omen',
      mapName: 'Ascent',
      queueType: 'COMPETITIVE',
    });
    create.flush({
      id: 'match-id',
      ...create.request.body,
      rrChange: null,
      kills: null,
      deaths: null,
      assists: null,
      acs: null,
      headshotPct: null,
      firstKills: null,
      firstDeaths: null,
      notes: null,
      reflection: null,
      reflectionPending: true,
    });
    http.expectOne('/api/v1/reflections/pending').flush([]);
    http
      .expectOne('/api/v1/matches?page=1&pageSize=100&sessionId=session-id')
      .flush({ items: [], total: 0, page: 1, pageSize: 100 });
    http
      .expectOne('/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http.expectOne('/api/v1/matches/summary').flush(emptyMatchSummary);
    fixture.detectChanges();

    expect(element.textContent).toContain('O que aconteceu nas decisões?');
    expect(element.textContent).toContain('Salvar depois');
  });

  it('shows the personal login before loading private data', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    http.expectOne('/api/v1/auth/session').flush({
      enabled: true,
      authenticated: false,
      email: null,
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Acesso pessoal');
    expect(element.textContent).toContain('Entre para acessar sua rotina');
    expect(element.querySelector('input[autocomplete="current-password"]')).toBeTruthy();
    http.expectNone('/api/v1/profile');
  });

  it('shows tracker averages and edits a match from its completed session', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const match = {
      id: 'historic-match-id',
      sessionId: 'completed-session-id',
      session: {
        id: 'completed-session-id',
        type: 'RANKED',
        status: 'COMPLETED',
        startedAt: '2026-08-05T23:00:00.000Z',
        endedAt: '2026-08-06T01:00:00.000Z',
        plannedBlockTitle: 'Ranked de terça',
      },
      startedAt: '2026-08-05T23:30:00.000Z',
      queueType: 'COMPETITIVE',
      agentName: 'Omen',
      mapName: 'Ascent',
      result: 'WIN',
      allyScore: 13,
      enemyScore: 9,
      rrChange: 18,
      kills: 20,
      deaths: 14,
      assists: 8,
      acs: 242,
      headshotPct: 24.5,
      firstKills: 3,
      firstDeaths: 1,
      notes: null,
      reflection: null,
      reflectionPending: true,
    };
    const summary = {
      ...emptyMatchSummary,
      totalMatches: 1,
      linkedSessions: 1,
      wins: 1,
      winRate: 100,
      totalRr: 18,
      averageRr: 18,
      averageKills: 20,
      averageDeaths: 14,
      averageAssists: 8,
      kdRatio: 1.43,
      averageAcs: 242,
      averageHeadshotPct: 24.5,
      averageFirstKills: 3,
      averageFirstDeaths: 1,
    };
    flushWorkspace([], [], [match], summary);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Partidas'))
      ?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Histórico de partidas');
    expect(element.textContent).toContain('100%');
    expect(element.textContent).toContain('Ranked de terça');

    Array.from(element.querySelectorAll<HTMLButtonElement>('.history-actions button'))
      .find((button) => button.textContent?.includes('Editar'))
      ?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Editar partida');
    element.querySelector<HTMLFormElement>('form[aria-labelledby="match-title"]')?.requestSubmit();

    const update = http.expectOne('/api/v1/matches/historic-match-id');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.sessionId).toBe('completed-session-id');
    update.flush(match);
    http.expectOne('/api/v1/reflections/pending').flush([]);
    http
      .expectOne('/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [match], total: 1, page: 1, pageSize: 20 });
    http.expectOne('/api/v1/matches/summary').flush(summary);
  });

  it('offers an ended cycle as a preserved reusable draft', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace([
      {
        id: 'old-cycle-id',
        name: 'Ciclo de decisão',
        startDate: '2026-08-06',
        endDate: '2026-08-19',
        durationDays: 14,
        status: 'COMPLETED',
        conclusion: 'IMPROVED',
        conclusionNotes: 'Mais clareza.',
        focuses: [],
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cyclesButton = Array.from(element.querySelectorAll<HTMLButtonElement>('nav button')).find(
      (button) => button.textContent?.includes('Ciclos'),
    );
    cyclesButton?.click();
    fixture.detectChanges();

    const reuseButton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Reutilizar ciclo'),
    );
    expect(reuseButton).toBeTruthy();
    reuseButton?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Reutilizar sem apagar o histórico');
    expect(element.textContent).toContain('O ciclo original continuará intacto');
  });

  it('keeps a confirmed week locked until editing is requested', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace(
      [],
      [
        {
          id: 'plan-id',
          weekStart: '2026-08-03',
          weekEnd: '2026-08-09',
          status: 'CONFIRMED',
          rankedTargetMin: 10,
          rankedTargetMax: 14,
          weeklyIntent: 'Clareza nas decisões.',
          blocks: [],
        },
      ],
    );
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const weekButton = Array.from(element.querySelectorAll<HTMLButtonElement>('nav button')).find(
      (button) => button.textContent?.includes('Semana'),
    );
    weekButton?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Editar semana');
    expect(element.textContent).toContain('Concluir semana');
    expect(element.textContent).not.toContain('Salvar alterações');
    expect(element.textContent).not.toContain('Novo bloco');

    const editButton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Editar semana'),
    );
    editButton?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Salvar alterações');
    expect(element.textContent).toContain('Novo bloco');
    expect(element.textContent).toContain('Hora de início (24h)');
    expect(element.querySelectorAll('input[type="datetime-local"]')).toHaveLength(0);
  });

  it('hides timezone and uses explicit 24-hour profile fields', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const profileButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('nav button'),
    ).find((button) => button.textContent?.includes('Perfil'));
    profileButton?.click();
    fixture.detectChanges();

    expect(element.querySelector('input[name="timezone"]')).toBeNull();
    expect(element.textContent).toContain('Início padrão (24h)');
    expect(element.textContent).toContain('Fim padrão (24h)');
    expect(element.querySelector('input[name="defaultSessionStart"]')?.getAttribute('type')).toBe(
      'text',
    );
    expect(element.querySelector('input[name="defaultSessionEnd"]')?.getAttribute('type')).toBe(
      'text',
    );
  });

  it('closes a confirmed week from its explicit action', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const confirmedPlan = {
      id: 'plan-id',
      weekStart: '2026-08-03',
      weekEnd: '2026-08-09',
      status: 'CONFIRMED',
      rankedTargetMin: 10,
      rankedTargetMax: 14,
      weeklyIntent: 'Clareza nas decisões.',
      blocks: [],
    };
    flushWorkspace([], [confirmedPlan]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Semana'))
      ?.click();
    fixture.detectChanges();
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Concluir semana'))
      ?.click();

    const request = http.expectOne('/api/v1/weekly-plans/plan-id/close');
    expect(request.request.method).toBe('POST');
    request.flush({ ...confirmedPlan, status: 'CLOSED' });
    fixture.detectChanges();

    expect(element.textContent).toContain('Semana encerrada');
    expect(element.textContent).not.toContain('Concluir semana');
  });

  it('shows coaching feedback and opens its focus conversion', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace([], [], [], emptyMatchSummary, emptyDashboardSummary, [
      {
        id: 'coach-session-id',
        coachName: 'Glym',
        heldAt: '2026-08-06T14:00:00.000Z',
        durationMinutes: 60,
        summary: 'Revisão de decisões no ataque.',
        feedbacks: [
          {
            id: 'feedback-id',
            coachSessionId: 'coach-session-id',
            category: 'DECISION',
            priority: 'HIGH',
            feedbackText: 'Definir a intenção antes de usar utilitário.',
            evidence: 'Round 8 da Ascent.',
            suggestedAction: 'Verbalizar a intenção antes do execute.',
            status: 'OPEN',
            focusAreaId: null,
            focusArea: null,
          },
        ],
      },
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Coaching'))
      ?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Feedback que vira prática');
    expect(element.textContent).toContain('Definir a intenção antes de usar utilitário');
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Transformar em foco'))
      ?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Feedback → comportamento observável');
  });

  it('renders weekly process evidence in the evolution view', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace([], [], [], emptyMatchSummary, {
      ...emptyDashboardSummary,
      week: {
        planId: 'plan-id',
        weekStart: '2026-08-03',
        weekEnd: '2026-08-09',
        status: 'CONFIRMED',
        weeklyIntent: 'Responder calls sem atraso.',
      },
      adherence: {
        ...emptyDashboardSummary.adherence,
        plannedMinutes: 600,
        completedMinutes: 420,
        timePercent: 70,
        consciousRankedCount: 8,
        rankedTargetMin: 10,
        rankedTargetMax: 14,
      },
      results: { matchCount: 8, wins: 5, losses: 3, rrDelta: 31 },
      process: {
        ...emptyDashboardSummary.process,
        sampleSize: 8,
        decisionClarity: 4.1,
        callResponse: 3.8,
        patternReading: 4,
        repeatedPatterns: [{ label: 'Calls atrasadas', count: 3 }],
      },
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Evolução'))
      ?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Responder calls sem atraso');
    expect(element.textContent).toContain('7h');
    expect(element.textContent).toContain('5V · 3D');
    expect(element.textContent).toContain('Calls atrasadas');
    expect(element.textContent).toContain('Gerar revisão');
  });

  it('keeps backup restore disabled until the merge warning is accepted', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Dados'))
      ?.click();
    fixture.detectChanges();

    const fileInput = element.querySelector<HTMLInputElement>('input[type="file"]');
    expect(element.textContent).toContain('Dados locais adicionais não serão apagados');
    expect(fileInput?.disabled).toBe(true);
  });

  it('shows disabled external integrations without blocking the local workspace', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushWorkspace();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('nav button'))
      .find((button) => button.textContent?.includes('Assistente'))
      ?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Coach pós-treino');
    expect(element.textContent).toContain('Sincronização unidirecional');
    expect(element.textContent).toContain('Somente leitura');
    expect(element.textContent).toContain('OPENAI_API_KEY');
  });
});
