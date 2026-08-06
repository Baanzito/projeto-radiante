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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushWorkspace(cycles: unknown[] = [], plans: unknown[] = []): void {
    http.expectOne('http://127.0.0.1:3000/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.3.0',
    });
    http.expectOne('http://127.0.0.1:3000/api/v1/profile').flush(profile);
    http.expectOne('http://127.0.0.1:3000/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/training-cycles').flush(cycles);
    http.expectOne('http://127.0.0.1:3000/api/v1/weekly-plans').flush(plans);
    http.expectOne('http://127.0.0.1:3000/api/v1/sessions/active').flush(null);
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
    expect(element.textContent).toContain('Marco 2');
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
