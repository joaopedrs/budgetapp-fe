import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { LogService } from '../../core/services/log.service';
import { AuthService } from '../../core/services/auth.service';
import { ActionType, actionTypeLabel, SystemLog } from '../../core/models/log.model';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    MatTableModule, MatChipsModule, MatCardModule, MatProgressSpinnerModule,
    MatIconModule, MatButtonModule, RouterLink, DatePipe, TranslocoModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Logs do Sistema</h2>
          <p class="page-subtitle">
            @if (isSystemTenant()) {
              <ng-container>Visão cross-tenant — todos os logs da plataforma</ng-container>
            } @else {
              <ng-container>Registros de atividade do seu tenant</ng-container>
            }
          </p>
        </div>
      </div>

      <mat-card>
        @if (loading()) {
          <div class="loading-center"><mat-spinner diameter="40" /></div>
        } @else {
          <table mat-table [dataSource]="logs()" class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let l">{{ l.id }}</td>
            </ng-container>
            <ng-container matColumnDef="level">
              <th mat-header-cell *matHeaderCellDef>Nível</th>
              <td mat-cell *matCellDef="let l">
                <mat-chip [class]="levelClass(l.logLevel)">{{ l.logLevel }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Ação</th>
              <td mat-cell *matCellDef="let l">{{ actionLabel(l.actionType) }}</td>
            </ng-container>
            <ng-container matColumnDef="tenant">
              <th mat-header-cell *matHeaderCellDef>Tenant</th>
              <td mat-cell *matCellDef="let l">{{ l.tenantName || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>Usuário</th>
              <td mat-cell *matCellDef="let l">{{ l.userName || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="screen">
              <th mat-header-cell *matHeaderCellDef>Tela</th>
              <td mat-cell *matCellDef="let l"><code>{{ l.screenCode }}</code></td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Descrição</th>
              <td mat-cell *matCellDef="let l">{{ l.description }}</td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Data/Hora</th>
              <td mat-cell *matCellDef="let l">{{ l.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let l">
                <a mat-icon-button [routerLink]="['/logs', l.id]" title="Detalhes">
                  <mat-icon>visibility</mat-icon>
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr mat-row *matRowDef="let row; columns: columns();"></tr>
          </table>

          @if (logs().length === 0) {
            <div class="no-data">Nenhum log encontrado.</div>
          }
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
    .no-data { text-align: center; padding: 40px; color: rgba(0,0,0,0.4); }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .chip-info    { background: #dbeafe !important; color: #1d4ed8 !important; }
    .chip-warning { background: #fef3c7 !important; color: #92400e !important; }
    .chip-error   { background: #fee2e2 !important; color: #b91c1c !important; }
    .chip-debug   { background: #f3f4f6 !important; color: #374151 !important; }
  `]
})
export class LogsComponent implements OnInit {
  private logService = inject(LogService);
  private auth = inject(AuthService);

  isSystemTenant = this.auth.isSystemTenant;
  logs = signal<SystemLog[]>([]);
  loading = signal(true);

  columns = computed(() => {
    const base = ['id', 'level', 'action', 'user', 'screen', 'description', 'date', 'actions'];
    return this.isSystemTenant() ? ['id', 'level', 'action', 'tenant', 'user', 'screen', 'description', 'date', 'actions'] : base;
  });

  ngOnInit() {
    this.logService.getAll().subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  actionLabel(a: ActionType) { return actionTypeLabel(a); }

  levelClass(level: string): string {
    const map: Record<string, string> = {
      Info: 'chip-info', Warning: 'chip-warning', Error: 'chip-error', Debug: 'chip-debug'
    };
    return map[level] ?? 'chip-debug';
  }
}
