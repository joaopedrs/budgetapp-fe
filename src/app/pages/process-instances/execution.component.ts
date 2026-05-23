import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoModule } from '@jsverse/transloco';
import { ProcessInstanceService } from '../../core/services/process-instance.service';
import {
  AvailableActionDto, ProcessInstanceDetailResponse, ProcessInstanceStatus
} from '../../core/models/process-instance.model';
import { DynamicFormComponent } from '../../shared/dynamic-form/dynamic-form.component';

/**
 * Tela de execução de uma instância de processo.
 *
 * **Layout:**
 * - Cabeçalho com nome do processo, número da instância, status (chip colorido) e etapa atual
 * - Formulário dinâmico (`DynamicFormComponent`) com schema versionado e valores atuais
 * - Painel de ações com botões dinâmicos vindos de `availableActions` (vazio se não for executor)
 * - Painel de histórico (expansível, ordem decrescente)
 *
 * **Modo live**: passa `processId` para o DynamicForm reavaliar fórmulas server-side.
 * **Permissão**: se `canExecute=false`, formulário entra em modo read-only e botões somem.
 */
@Component({
  selector: 'app-execution',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, TranslocoModule, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
    MatExpansionModule,
    DynamicFormComponent
  ],
  template: `
    <div class="page" *transloco="let t">
      @if (loading()) {
        <mat-card><div class="loading"><mat-spinner diameter="40" /></div></mat-card>
      } @else if (instance()) {
        @let inst = instance()!;
        <div class="page-header">
          <div>
            <h2 class="page-title">{{ inst.processName }}</h2>
            <p class="page-subtitle">
              {{ t('execution.instance') }} #{{ inst.id }} ·
              {{ t('execution.requestedBy') }} <strong>{{ inst.requesterUserName }}</strong> ·
              {{ inst.createdAt | date:'short' }}
            </p>
          </div>
          <div class="header-actions">
            <a mat-stroked-button routerLink="/inbox">
              <mat-icon>arrow_back</mat-icon> {{ t('execution.backToInbox') }}
            </a>
          </div>
        </div>

        <mat-card class="status-card">
          <div class="status-row">
            <div>
              <small>{{ t('execution.status') }}</small>
              <mat-chip [class]="statusChipClass(inst.status)">
                {{ t('execution.statuses.' + inst.status) }}
              </mat-chip>
            </div>
            @if (inst.currentStepNumber) {
              <div>
                <small>{{ t('execution.currentStep') }}</small>
                <div class="step-value">{{ t('steps.tabPrefix') }} {{ inst.currentStepNumber }}</div>
              </div>
            }
            @if (inst.finishedAt) {
              <div>
                <small>{{ t('execution.finishedAt') }}</small>
                <div>{{ inst.finishedAt | date:'short' }}</div>
              </div>
            }
            <div>
              <small>{{ t('execution.versions') }}</small>
              <div class="versions">processo v{{ inst.processVersion }} · form v{{ inst.formVersion }}</div>
            </div>
          </div>

          @if (!inst.canExecute && inst.status === 'EmAndamento') {
            <div class="info-banner">
              <mat-icon>visibility</mat-icon>
              {{ t('execution.readOnlyReason') }}
            </div>
          }
        </mat-card>

        <mat-card class="form-card">
          <h3>{{ t('execution.formData') }}</h3>
          <app-dynamic-form
            [schema]="inst.formSchema"
            [value]="inst.formData"
            [processId]="inst.processId"
            [disabled]="!inst.canExecute || inst.status !== 'EmAndamento'"
            (valueChange)="onFormChange($event)" />
        </mat-card>

        @if (inst.canExecute && inst.status === 'EmAndamento' && inst.availableActions.length > 0) {
          <mat-card class="actions-card">
            <h3>{{ t('execution.availableActions') }}</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('execution.note') }}</mat-label>
              <textarea matInput rows="2" [formControl]="noteCtrl" maxlength="2000"></textarea>
              <mat-hint>{{ t('execution.noteHint') }}</mat-hint>
            </mat-form-field>

            <div class="action-buttons">
              @for (a of inst.availableActions; track a.actionKey) {
                <button mat-flat-button
                        [color]="buttonColor(a)"
                        [disabled]="executing()"
                        (click)="execute(a)">
                  <mat-icon>{{ buttonIcon(a) }}</mat-icon>
                  {{ a.actionLabel }}
                </button>
              }
            </div>
          </mat-card>
        }

        <mat-card class="history-card">
          <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>history</mat-icon> {{ t('execution.history') }} ({{ instance()!.history.length }})
              </mat-panel-title>
            </mat-expansion-panel-header>

            @if (instance()!.history.length === 0) {
              <p class="empty-history">{{ t('execution.noHistory') }}</p>
            } @else {
              <div class="timeline">
                @for (h of instance()!.history; track h.id) {
                  <div class="timeline-item">
                    <div class="tl-dot"></div>
                    <div class="tl-content">
                      <div class="tl-header">
                        <strong>{{ h.actionLabel }}</strong>
                        <span class="tl-step">{{ t('steps.tabPrefix') }} {{ h.stepNumber }}</span>
                      </div>
                      <div class="tl-meta">
                        {{ h.executedByUserName }} · {{ h.executedAt | date:'short' }}
                      </div>
                      @if (h.note) {
                        <div class="tl-note">{{ h.note }}</div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-expansion-panel>
        </mat-card>
      } @else {
        <mat-card>
          <p>{{ t('execution.notFound') }}</p>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .header-actions { display:flex; gap:12px; }
    .loading { display:flex; justify-content:center; padding:40px; }

    .status-card { padding:16px; margin-bottom:16px; }
    .status-row { display:flex; gap:32px; flex-wrap:wrap; }
    .status-row small { display:block; color:rgba(0,0,0,.5); font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
    .step-value { font-weight:600; color:#1e1145; }
    .versions { font-family:monospace; font-size:12px; color:rgba(0,0,0,.6); }

    .info-banner {
      display:flex; align-items:center; gap:8px;
      background:#dbeafe; border:1px solid #60a5fa; border-radius:8px;
      padding:10px 14px; margin-top:12px; font-size:13px; color:#1e40af;
    }

    .form-card, .actions-card, .history-card { padding:20px; margin-bottom:16px; }
    .form-card h3, .actions-card h3 { margin:0 0 16px; font-size:16px; font-weight:600; color:#1e1145; }
    .full-width { width:100%; }
    .action-buttons { display:flex; gap:12px; flex-wrap:wrap; margin-top:8px; }

    .empty-history { color:rgba(0,0,0,.4); text-align:center; padding:16px; }
    .timeline { padding:12px 0; position:relative; }
    .timeline::before {
      content:''; position:absolute; left:8px; top:0; bottom:0; width:2px; background:rgba(124,58,237,.2);
    }
    .timeline-item { display:flex; gap:16px; margin-bottom:16px; padding-left:0; position:relative; }
    .tl-dot {
      width:18px; height:18px; border-radius:50%; background:#7c3aed; border:3px solid white;
      box-shadow:0 0 0 2px #7c3aed; flex-shrink:0; z-index:1;
    }
    .tl-content { flex:1; padding-top:0; }
    .tl-header { display:flex; gap:12px; align-items:baseline; }
    .tl-step { font-size:11px; color:#7c3aed; background:#ede9fe; padding:1px 8px; border-radius:8px; }
    .tl-meta { font-size:12px; color:rgba(0,0,0,.55); margin-top:2px; }
    .tl-note { margin-top:6px; padding:8px 12px; background:#faf9ff; border-radius:6px; font-size:13px; }

    .chip-em-andamento { background:#dbeafe !important; color:#1e40af !important; }
    .chip-finalizado   { background:#dcfce7 !important; color:#15803d !important; }
    .chip-cancelado    { background:#fee2e2 !important; color:#b91c1c !important; }
  `]
})
export class ExecutionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private instanceService = inject(ProcessInstanceService);

  instance = signal<ProcessInstanceDetailResponse | null>(null);
  loading = signal(true);
  executing = signal(false);

  noteCtrl = new FormControl<string>('', { nonNullable: true });
  /** Snapshot atual do form (atualizado via valueChange do DynamicForm). */
  private currentFormData: Record<string, unknown> = {};

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = +params.get('id')!;
      if (id) this.load(id);
    });
  }

  private load(id: number) {
    this.loading.set(true);
    this.instanceService.getById(id).subscribe({
      next: r => {
        this.instance.set(r);
        this.currentFormData = { ...r.formData };
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.status === 404 ? 'Instância não encontrada.' : 'Erro ao carregar instância.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.router.navigate(['/inbox']);
      }
    });
  }

  onFormChange(values: Record<string, unknown>) {
    this.currentFormData = values;
  }

  execute(action: AvailableActionDto) {
    const inst = this.instance();
    if (!inst) return;

    // Confirmação para ações destrutivas (Cancelar/Reprovar).
    if (this.isDestructive(action) &&
        !confirm(`Tem certeza que deseja executar "${action.actionLabel}"?`)) {
      return;
    }

    this.executing.set(true);
    this.instanceService.executeAction(inst.id, {
      actionKey: action.actionKey,
      formData: this.currentFormData,
      note: this.noteCtrl.value || null
    }).subscribe({
      next: () => {
        this.executing.set(false);
        this.snack.open(`Ação "${action.actionLabel}" executada.`, 'OK',
          { duration: 3000, panelClass: 'snack-success' });
        this.noteCtrl.reset('');
        this.load(inst.id); // recarrega o estado atualizado
      },
      error: err => {
        this.executing.set(false);
        const msg = err?.error?.message ?? err?.error?.error ?? 'Erro ao executar ação.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }

  statusChipClass(status: ProcessInstanceStatus): string {
    const map: Record<ProcessInstanceStatus, string> = {
      'EmAndamento': 'chip-em-andamento',
      'Finalizado':  'chip-finalizado',
      'Cancelado':   'chip-cancelado'
    };
    return map[status] ?? '';
  }

  buttonColor(a: AvailableActionDto): 'primary' | 'warn' | undefined {
    if (a.transitionType === 'Finalizar' && a.actionKey.toLowerCase().includes('cancel')) return 'warn';
    if (a.actionKey.toLowerCase().includes('repro')) return 'warn';
    return 'primary';
  }

  buttonIcon(a: AvailableActionDto): string {
    switch (a.transitionType) {
      case 'Avancar':         return 'arrow_forward';
      case 'Finalizar':       return a.actionKey.toLowerCase().includes('cancel') ? 'cancel' : 'flag';
      case 'VoltarParaEtapa': return 'undo';
      default:                return 'check';
    }
  }

  private isDestructive(a: AvailableActionDto): boolean {
    const k = a.actionKey.toLowerCase();
    return k.includes('cancel') || k.includes('repro');
  }
}
