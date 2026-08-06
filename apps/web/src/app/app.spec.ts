import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders the seeded profile when the local foundation is available', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    http.expectOne('http://127.0.0.1:3000/api/v1/health').flush({
      status: 'ok',
      services: { api: 'up', database: 'up' },
      version: '0.1.0',
    });
    http.expectOne('http://127.0.0.1:3000/api/v1/profile').flush({
      displayName: 'Diego',
      timezone: 'America/Sao_Paulo',
      currentRank: 'Ascendente 2',
      sensitivity: 0.179,
      dpi: 3200,
      weeklyRankedMin: 10,
      weeklyRankedMax: 14,
      primaryGoal: 'Atingir Radiant.',
      activeCycle: null,
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Diego');
    expect(element.textContent).toContain('Ascendente 2');
    expect(element.textContent).toContain('10–14 rankeds');
  });
});
