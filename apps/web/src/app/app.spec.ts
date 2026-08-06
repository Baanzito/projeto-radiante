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

  it('renders the complete Marco 1 workspace', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    http.expectOne('http://127.0.0.1:3000/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.2.0',
    });
    http.expectOne('http://127.0.0.1:3000/api/v1/profile').flush(profile);
    http.expectOne('http://127.0.0.1:3000/api/v1/focus-areas?includeInactive=true').flush([]);
    http.expectOne('http://127.0.0.1:3000/api/v1/training-cycles').flush([]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Ascendente 2');
    expect(element.textContent).toContain('10–14');
    expect(element.textContent).toContain('Criar ciclo');
    expect(element.textContent).toContain('Marco 1');
  });
});
