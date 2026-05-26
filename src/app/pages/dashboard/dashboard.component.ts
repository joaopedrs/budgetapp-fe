import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';

/**
 * Dashboard com contadores reais carregados em UMA chamada (/dashboard/stats).
 * Cards condicionais por contexto: system tenant não tem
 * "processos ativos" nem "instâncias em andamento" (zera no BE).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslocoModule],
  template: `
    <div class="dashboard" *transloco="let t">
      <h2 class="page-title">{{ t('dashboard.title') }}</h2>
      <p class="page-subtitle">
        {{ t('dashboard.welcome', { name: auth.displayName() }) }}
      </p>

      <div class="cards-grid">
        <!-- Usuários -->
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">people</mat-icon>
            <div class="stat-info">
              <div class="stat-label">{{ t('dashboard.users') }}</div>
              <div class="stat-value">
                @if (loading()) { <mat-spinner diameter="20" /> }
                @else { {{ stats()?.userCount ?? 0 }} }
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Logs hoje -->
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">receipt_long</mat-icon>
            <div class="stat-info">
              <div class="stat-label">{{ t('dashboard.logsToday') }}</div>
              <div class="stat-value">
                @if (loading()) { <mat-spinner diameter="20" /> }
                @else { {{ stats()?.logsToday ?? 0 }} }
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        @if (!isSystem()) {
          <!-- Processos ativos (só geral) -->
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon">account_tree</mat-icon>
              <div class="stat-info">
                <div class="stat-label">{{ t('dashboard.processesActive') }}</div>
                <div class="stat-value">
                  @if (loading()) { <mat-spinner diameter="20" /> }
                  @else { {{ stats()?.processesActive ?? 0 }} }
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Instâncias em andamento (só geral) -->
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon">pending_actions</mat-icon>
              <div class="stat-info">
                <div class="stat-label">{{ t('dashboard.instancesInProgress') }}</div>
                <div class="stat-value">
                  @if (loading()) { <mat-spinner diameter="20" /> }
                  @else { {{ stats()?.instancesInProgress ?? 0 }} }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Perfil — sempre presente -->
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">verified_user</mat-icon>
            <div class="stat-info">
              <div class="stat-label">{{ t('dashboard.yourProfile') }}</div>
              <div class="stat-value role">{{ auth.user()?.role }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0 0 32px; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .stat-card mat-card-content {
      display: flex; align-items: center; gap: 16px; padding: 20px !important;
    }
    .stat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--color-primary, #7c3aed); }
    .stat-label { font-size: 13px; color: rgba(0,0,0,0.5); }
    .stat-value { font-size: 24px; font-weight: 700; color: #1e1145; display:flex; align-items:center; min-height:30px; }
    .stat-value.role { font-size: 18px; text-transform: capitalize; }
  `]
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private dashboardService = inject(DashboardService);

  isSystem = this.auth.isSystemTenant;
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.dashboardService.getStats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      // Silencia erro — UX continua mostrando 0 e o spinner some.
      error: () => { this.loading.set(false); }
    });
  }
}
