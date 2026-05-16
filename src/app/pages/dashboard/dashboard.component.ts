import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslocoModule],
  template: `
    <div class="dashboard">
      <h2 class="page-title">Dashboard</h2>
      <p class="page-subtitle">Bem-vindo, <strong>{{ auth.user()?.email }}</strong>!</p>

      <div class="cards-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">people</mat-icon>
            <div class="stat-info">
              <div class="stat-label">Usuários</div>
              <div class="stat-value">—</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">receipt_long</mat-icon>
            <div class="stat-info">
              <div class="stat-label">Logs Hoje</div>
              <div class="stat-value">—</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">verified_user</mat-icon>
            <div class="stat-info">
              <div class="stat-label">Seu Perfil</div>
              <div class="stat-value">{{ auth.user()?.role }}</div>
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
    .stat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--color-primary); }
    .stat-label { font-size: 13px; color: rgba(0,0,0,0.5); }
    .stat-value { font-size: 24px; font-weight: 700; color: #1e1145; }
  `]
})
export class DashboardComponent {
  auth = inject(AuthService);
}
