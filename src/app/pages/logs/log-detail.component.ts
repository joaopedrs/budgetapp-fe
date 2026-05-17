import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { LogService } from '../../core/services/log.service';
import { ActionType, actionTypeLabel, SystemLog } from '../../core/models/log.model';

@Component({
  selector: 'app-log-detail',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule, DatePipe
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Detalhes do Log</h2>
          <p class="page-subtitle">Visualização somente leitura</p>
        </div>
        <button mat-stroked-button (click)="router.navigate(['/logs'])">
          <mat-icon>arrow_back</mat-icon> Voltar
        </button>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="40" /></div>
      } @else if (log()) {
        <mat-card class="detail-card">
          <mat-card-content>
            <div class="grid">
              <div class="field">
                <label>ID</label>
                <div class="value">{{ log()!.id }}</div>
              </div>
              <div class="field">
                <label>Data / Hora</label>
                <div class="value">{{ log()!.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</div>
              </div>

              <div class="field">
                <label>Usuário</label>
                <div class="value">{{ log()!.userName || '—' }}
                  @if (log()!.userId) { <small>(ID {{ log()!.userId }})</small> }
                </div>
              </div>
              <div class="field">
                <label>Tenant</label>
                <div class="value">{{ log()!.tenantName || '—' }}
                  @if (log()!.tenantId) { <small>(ID {{ log()!.tenantId }})</small> }
                </div>
              </div>

              <div class="field">
                <label>Log Level</label>
                <div class="value">
                  <mat-chip [class]="levelClass(log()!.logLevel)">{{ log()!.logLevel }}</mat-chip>
                </div>
              </div>
              <div class="field">
                <label>Ação</label>
                <div class="value">{{ actionLabel(log()!.actionType) }}</div>
              </div>

              <div class="field">
                <label>Tela</label>
                <div class="value"><code>{{ log()!.screenCode }}</code></div>
              </div>
              <div class="field">
                <label>Chave</label>
                <div class="value"><code>{{ log()!.keyCode }}</code></div>
              </div>

              <div class="field full">
                <label>Descrição</label>
                <div class="value description">{{ log()!.description }}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card><mat-card-content>Log não encontrado.</mat-card-content></mat-card>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .detail-card { max-width: 900px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 24px;
    }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
    .field.full { grid-column: 1 / -1; }
    .field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: rgba(0,0,0,0.55);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .field .value {
      font-size: 15px;
      color: #1f2937;
      padding: 10px 12px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      min-height: 20px;
    }
    .field .value small { color: rgba(0,0,0,0.5); margin-left: 6px; }
    .description { white-space: pre-wrap; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
    .chip-info    { background: #dbeafe !important; color: #1d4ed8 !important; }
    .chip-warning { background: #fef3c7 !important; color: #92400e !important; }
    .chip-error   { background: #fee2e2 !important; color: #b91c1c !important; }
    .chip-debug   { background: #f3f4f6 !important; color: #374151 !important; }
  `]
})
export class LogDetailComponent implements OnInit {
  private logService = inject(LogService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  log = signal<SystemLog | null>(null);
  loading = signal(true);

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.logService.getById(id).subscribe({
      next: l => { this.log.set(l); this.loading.set(false); },
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
