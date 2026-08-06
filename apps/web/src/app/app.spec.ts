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
  ): void {
    http.expectOne('http://127.0.0.1:3000/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.4.0',
    });
    http.expectOne('http://127.0.0.1:3000/api/v1/profile').flush(profile);
    http.expectOne('http://127.0.0.1:3000/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/training-cycles').flush(cycles);
    http.expectOne('http://127.0.0.1:3000/api/v1/weekly-plans').flush(plans);
    http.expectOne('http://127.0.0.1:3000/api/v1/sessions/active').flush(null);
    http.expectOne('http://127.0.0.1:3000/api/v1/reflections/pending').flush([]);
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=20')
      .flush({ items: matches, total: matches.length, page: 1, pageSize: 20 });
    http.expectOne('http://127.0.0.1:3000/api/v1/matches/summary').flush(matchSummary);
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
    expect(element.textContent).toContain('Marco 3');
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

    http.expectOne('http://127.0.0.1:3000/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.4.0',
    });
    http.expectOne('http://127.0.0.1:3000/api/v1/profile').flush(profile);
    http.expectOne('http://127.0.0.1:3000/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/training-cycles').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/weekly-plans').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/sessions/active').flush(session);
    http.expectOne('http://127.0.0.1:3000/api/v1/reflections/pending').flush([]);
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http.expectOne('http://127.0.0.1:3000/api/v1/matches/summary').flush(emptyMatchSummary);
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=100&sessionId=session-id')
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

    const create = http.expectOne('http://127.0.0.1:3000/api/v1/matches');
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
    http.expectOne('http://127.0.0.1:3000/api/v1/reflections/pending').flush([]);
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=100&sessionId=session-id')
      .flush({ items: [], total: 0, page: 1, pageSize: 100 });
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [], total: 0, page: 1, pageSize: 20 });
    http.expectOne('http://127.0.0.1:3000/api/v1/matches/summary').flush(emptyMatchSummary);
    fixture.detectChanges();

    expect(element.textContent).toContain('O que aconteceu nas decisões?');
    expect(element.textContent).toContain('Salvar depois');
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

    const update = http.expectOne('http://127.0.0.1:3000/api/v1/matches/historic-match-id');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.sessionId).toBe('completed-session-id');
    update.flush(match);
    http.expectOne('http://127.0.0.1:3000/api/v1/reflections/pending').flush([]);
    http
      .expectOne('http://127.0.0.1:3000/api/v1/matches?page=1&pageSize=20')
      .flush({ items: [match], total: 1, page: 1, pageSize: 20 });
    http.expectOne('http://127.0.0.1:3000/api/v1/matches/summary').flush(summary);
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

    const request = http.expectOne('http://127.0.0.1:3000/api/v1/weekly-plans/plan-id/close');
    expect(request.request.method).toBe('POST');
    request.flush({ ...confirmedPlan, status: 'CLOSED' });
    fixture.detectChanges();

    expect(element.textContent).toContain('Semana encerrada');
    expect(element.textContent).not.toContain('Concluir semana');
  });
});
