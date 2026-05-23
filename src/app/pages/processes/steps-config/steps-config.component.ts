import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import {
  AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import {
  EXECUTOR_TYPES, ProcessExecutorType, ProcessStepDto, ProcessStepTransition,
  TRANSITION_TYPES
} from '../../../core/models/process-step.model';
import { ProcessStepService } from '../../../core/services/process-step.service';
import { ProcessService } from '../../../core/services/process.service';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { ProcessFormService } from '../../../core/services/process-form.service';
import { User } from '../../../core/models/user.model';
import { RoleListItem } from '../../../core/models/role.model';
import { FormField } from '../../../core/models/process-form.model';

/**
 * Configuração das 3 etapas fixas (Elaborar → Revisar → Aprovar) de um processo.
 *
 * **Estrutura:** um `FormGroup` raiz com `FormArray` de 3 etapas. Cada etapa é
 * um `FormGroup` com `FormArray` de ações. As invariantes do BE são espelhadas
 * aqui para fail-fast no UI; backend revalida no PUT.
 *
 * **Etapa 1:** controles de IsEnabled, ExecutorType e ações canônicas
 * (Cancelar/EnviarOrcamento) ficam `disabled` — o usuário não pode quebrar a
 * estrutura mínima exigida pelo motor de execução.
 *
 * **Diagrama de fluxo:** abaixo das abas, exibe caixas para cada etapa habilitada
 * com setas de avanço (→) e arcos de retorno (↶) baseados nas transições configuradas.
 */
@Component({
  selector: 'app-steps-config',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, TranslocoModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatCheckboxModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('steps.title') }}</h2>
          <p class="page-subtitle">
            {{ t('steps.subtitle') }} — <strong>{{ processName() || '...' }}</strong>
          </p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button [routerLink]="['/processes', processId()]">
            <mat-icon>arrow_back</mat-icon> {{ t('common.back') }}
          </a>
          <button mat-flat-button color="primary" (click)="onSave()"
                  [disabled]="saving() || loading()">
            @if (saving()) {
              <mat-spinner diameter="20" />
            } @else {
              <ng-container><mat-icon>save</mat-icon> {{ t('common.save') }}</ng-container>
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <mat-card><div class="loading"><mat-spinner diameter="40" /></div></mat-card>
      } @else {
        <form [formGroup]="form">
          <mat-tab-group dynamicHeight>
            @for (stepCtrl of stepsArray.controls; track $index; let i = $index) {
              <mat-tab>
                <ng-template mat-tab-label>
                  <mat-icon class="tab-icon" [class.disabled]="!isStepEnabled(i)">
                    {{ stepIcon(i + 1) }}
                  </mat-icon>
                  <span>{{ t('steps.tabPrefix') }} {{ i + 1 }}: {{ stepTitle(i + 1) }}</span>
                  @if (!isStepEnabled(i)) {
                    <mat-chip class="chip-off">{{ t('steps.disabled') }}</mat-chip>
                  }
                </ng-template>

                <div class="step-pane" [formGroup]="asGroup(stepCtrl)">
                  <!-- Habilitação -->
                  <mat-card class="section">
                    <div class="section-header">
                      <h3>{{ t('steps.activation') }}</h3>
                    </div>
                    <mat-slide-toggle formControlName="isEnabled" color="primary">
                      {{ asGroup(stepCtrl).value.isEnabled ? t('steps.enabled') : t('steps.disabled') }}
                    </mat-slide-toggle>
                    @if (i === 0) {
                      <p class="hint">
                        <mat-icon>lock</mat-icon>
                        {{ t('steps.step1Locked') }}
                      </p>
                    }
                  </mat-card>

                  <!-- Executor -->
                  <mat-card class="section">
                    <div class="section-header">
                      <h3>{{ t('steps.executor') }}</h3>
                    </div>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>{{ t('steps.executorType') }}</mat-label>
                      <mat-select formControlName="executorType" (selectionChange)="onExecutorTypeChange(i)">
                        @for (e of executorTypes; track e.value) {
                          <mat-option [value]="e.value"
                                      [disabled]="i === 0 && e.value !== 'Solicitante'">
                            <mat-icon>{{ e.icon }}</mat-icon> {{ t(e.labelKey) }}
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    @switch (asGroup(stepCtrl).value.executorType) {
                      @case ('Usuario') {
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>{{ t('steps.executorUser') }}</mat-label>
                          <mat-select formControlName="executorUserId">
                            @for (u of users(); track u.id) {
                              <mat-option [value]="u.id">{{ u.name }} ({{ u.email }})</mat-option>
                            }
                          </mat-select>
                          @if (asGroup(stepCtrl).get('executorUserId')?.hasError('required')
                            && asGroup(stepCtrl).get('executorUserId')?.touched) {
                            <mat-error>{{ t('steps.errors.userRequired') }}</mat-error>
                          }
                        </mat-form-field>
                      }
                      @case ('Papel') {
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>{{ t('steps.executorRole') }}</mat-label>
                          <mat-select formControlName="executorRoleId">
                            @for (r of roles(); track r.id) {
                              <mat-option [value]="r.id">{{ r.description }} ({{ r.usersCount }} usuários)</mat-option>
                            }
                          </mat-select>
                          @if (asGroup(stepCtrl).get('executorRoleId')?.hasError('required')
                            && asGroup(stepCtrl).get('executorRoleId')?.touched) {
                            <mat-error>{{ t('steps.errors.roleRequired') }}</mat-error>
                          }
                        </mat-form-field>
                      }
                      @case ('Cliente') {
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>{{ t('steps.executorFormField') }}</mat-label>
                          <mat-select formControlName="executorFormFieldId">
                            @if (contactFields().length === 0) {
                              <mat-option disabled>{{ t('steps.noContactFields') }}</mat-option>
                            }
                            @for (f of contactFields(); track f.id) {
                              <mat-option [value]="f.id">{{ f.label }} ({{ f.id }})</mat-option>
                            }
                          </mat-select>
                          <mat-hint>{{ t('steps.executorFormFieldHint') }}</mat-hint>
                        </mat-form-field>
                      }
                    }
                  </mat-card>

                  <!-- Configurações -->
                  <mat-card class="section">
                    <div class="section-header">
                      <h3>{{ t('steps.settings') }}</h3>
                    </div>
                    <mat-checkbox formControlName="notifyOnArrival">
                      {{ t('steps.notifyOnArrival') }}
                    </mat-checkbox>
                    <mat-checkbox formControlName="sendPdf">
                      {{ t('steps.sendPdf') }}
                      <small class="pdf-hint">({{ t('steps.sendPdfHint') }})</small>
                    </mat-checkbox>
                  </mat-card>

                  <!-- Ações -->
                  <mat-card class="section">
                    <div class="section-header">
                      <h3>{{ t('steps.actions') }}</h3>
                      <button mat-stroked-button type="button" color="primary"
                              (click)="addAction(i)" [disabled]="i === 0 && !canAddActionToStep1()">
                        <mat-icon>add</mat-icon> {{ t('steps.addAction') }}
                      </button>
                    </div>

                    <div formArrayName="actions">
                      @for (actCtrl of actionsOf(i).controls; track $index; let j = $index) {
                        <div class="action-row" [formGroupName]="j">
                          <mat-form-field appearance="outline" class="action-key">
                            <mat-label>{{ t('steps.actionKey') }}</mat-label>
                            <input matInput formControlName="actionKey"
                                   [readonly]="i === 0 && isCanonicalAction(j)" />
                          </mat-form-field>

                          <mat-form-field appearance="outline" class="action-label">
                            <mat-label>{{ t('steps.actionLabel') }}</mat-label>
                            <input matInput formControlName="actionLabel" />
                          </mat-form-field>

                          <mat-form-field appearance="outline" class="action-transition">
                            <mat-label>{{ t('steps.transition') }}</mat-label>
                            <mat-select formControlName="transitionType"
                                        [disabled]="i === 0 && isCanonicalAction(j)"
                                        (selectionChange)="onTransitionChange(i, j)">
                              @for (tr of transitionTypes; track tr.value) {
                                <mat-option [value]="tr.value">
                                  <mat-icon>{{ tr.icon }}</mat-icon> {{ t(tr.labelKey) }}
                                </mat-option>
                              }
                            </mat-select>
                          </mat-form-field>

                          @if (asGroup(actCtrl).value.transitionType === 'VoltarParaEtapa') {
                            <mat-form-field appearance="outline" class="action-target">
                              <mat-label>{{ t('steps.targetStep') }}</mat-label>
                              <mat-select formControlName="targetStepNumber">
                                @for (n of previousStepNumbers(i + 1); track n) {
                                  <mat-option [value]="n">{{ t('steps.tabPrefix') }} {{ n }}</mat-option>
                                }
                              </mat-select>
                            </mat-form-field>
                          }

                          <button mat-icon-button color="warn" type="button"
                                  [disabled]="i === 0 && isCanonicalAction(j)"
                                  (click)="removeAction(i, j)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      }

                      @if (actionsOf(i).length === 0) {
                        <div class="no-actions">{{ t('steps.noActions') }}</div>
                      }
                    </div>
                  </mat-card>
                </div>
              </mat-tab>
            }
          </mat-tab-group>

          <!-- Diagrama -->
          <mat-card class="diagram-card">
            <h3>{{ t('steps.flowDiagram') }}</h3>
            <div class="diagram">
              @for (step of enabledStepsView(); track step.stepNumber) {
                <div class="diagram-box" [class.is-final]="step.isFinal">
                  <div class="box-num">{{ step.stepNumber }}</div>
                  <div class="box-title">{{ stepTitle(step.stepNumber) }}</div>
                  <div class="box-executor">
                    <mat-icon>{{ executorIcon(step.executorType) }}</mat-icon>
                    {{ executorSummary(step) }}
                  </div>
                  @if (step.backTargets.length > 0) {
                    <div class="back-targets">
                      @for (bt of step.backTargets; track bt) {
                        <span class="back-arrow">↶ {{ t('steps.tabPrefix') }} {{ bt }}</span>
                      }
                    </div>
                  }
                </div>
                @if (!$last) { <mat-icon class="diagram-arrow">arrow_forward</mat-icon> }
              }
              @if (enabledStepsView().length === 0) {
                <p class="hint">{{ t('steps.allDisabled') }}</p>
              }
            </div>
          </mat-card>
        </form>
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .header-actions { display:flex; gap:12px; }
    .loading { display:flex; justify-content:center; padding:40px; }

    .tab-icon { vertical-align: middle; margin-right: 4px; color: #7c3aed; }
    .tab-icon.disabled { color: rgba(0,0,0,.3); }
    .chip-off { background:#f3f4f6 !important; color:#6b7280 !important; font-size:11px !important; min-height:20px !important; margin-left:8px !important; }

    .step-pane { padding:20px 0; display:flex; flex-direction:column; gap:16px; }
    .section { padding:20px; }
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .section h3 { margin:0; font-size:16px; font-weight:600; color:#1e1145; }
    .full-width { width:100%; }
    .hint { display:flex; align-items:center; gap:8px; color:#92400e; font-size:13px; margin-top:8px; }
    .hint mat-icon { font-size:18px; width:18px; height:18px; }
    .pdf-hint { color:rgba(0,0,0,.5); font-size:12px; margin-left:4px; }

    .action-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:8px; }
    .action-key       { flex:1 1 160px; }
    .action-label     { flex:1 1 200px; }
    .action-transition{ flex:1 1 180px; }
    .action-target    { flex:0 0 140px; }
    .no-actions { text-align:center; padding:16px; color:rgba(0,0,0,.4); }

    .diagram-card { padding:20px; margin-top:16px; }
    .diagram-card h3 { margin:0 0 16px; font-size:16px; font-weight:600; color:#1e1145; }
    .diagram { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .diagram-box {
      background:#faf9ff; border:1px solid rgba(124,58,237,.3); border-radius:12px;
      padding:14px 18px; min-width:200px; position:relative;
    }
    .diagram-box.is-final {
      background:#dcfce7; border-color:#22c55e;
    }
    .box-num { font-size:11px; font-weight:600; color:#7c3aed; text-transform:uppercase; }
    .box-title { font-weight:600; margin:2px 0 6px; color:#1e1145; }
    .box-executor { display:flex; align-items:center; gap:6px; color:rgba(0,0,0,.65); font-size:13px; }
    .box-executor mat-icon { font-size:16px; width:16px; height:16px; }
    .back-targets { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; }
    .back-arrow { font-size:12px; color:#b45309; background:#fef3c7; padding:2px 6px; border-radius:4px; }
    .diagram-arrow { color:rgba(124,58,237,.6); }
  `]
})
export class StepsConfigComponent implements OnInit {
  // ---- Constants ----
  readonly CANONICAL_KEYS = ['Cancelar', 'EnviarOrcamento'];
  readonly executorTypes = EXECUTOR_TYPES;
  readonly transitionTypes = TRANSITION_TYPES;

  // ---- Deps ----
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private stepService = inject(ProcessStepService);
  private processService = inject(ProcessService);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private formService = inject(ProcessFormService);

  // ---- State ----
  processId = signal<number>(0);
  processName = signal<string>('');
  loading = signal(true);
  saving = signal(false);

  users = signal<User[]>([]);
  roles = signal<RoleListItem[]>([]);
  contactFields = signal<FormField[]>([]);

  form: FormGroup = this.fb.group({ steps: this.fb.array<FormGroup>([]) });
  get stepsArray(): FormArray { return this.form.get('steps') as FormArray; }
  actionsOf(stepIndex: number): FormArray {
    return (this.stepsArray.at(stepIndex) as FormGroup).get('actions') as FormArray;
  }

  // Template helpers (template não usa `as`)
  asGroup(c: AbstractControl): FormGroup { return c as FormGroup; }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) { this.router.navigate(['/processes']); return; }
    this.processId.set(+idParam);

    // Carrega tudo em paralelo (process, steps, users, roles, form fields).
    forkJoin({
      process: this.processService.getById(this.processId()),
      steps: this.stepService.get(this.processId()),
      users: this.userService.getAll(),
      // pageSize alto pra evitar paginação no select; >500 → adicionar autocomplete depois.
      roles: this.roleService.getPaged(1, 200),
      form: this.formService.get(this.processId())
    }).subscribe({
      next: r => {
        this.processName.set(r.process.name);
        this.users.set(r.users);
        this.roles.set(r.roles.items);
        this.contactFields.set((r.form.schema?.fields ?? []).filter(f => f.type === 'Contact'));
        this.buildForm(r.steps.steps);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar configuração de etapas.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  // ---------- Form construction ----------
  private buildForm(steps: ProcessStepDto[]) {
    this.stepsArray.clear();
    for (const s of steps) {
      const grp = this.fb.group({
        id: [s.id ?? null],
        stepNumber: [s.stepNumber],
        isEnabled: [{ value: s.isEnabled, disabled: s.stepNumber === 1 }],
        executorType: [{ value: s.executorType, disabled: s.stepNumber === 1 }, Validators.required],
        executorUserId: [s.executorUserId ?? null],
        executorRoleId: [s.executorRoleId ?? null],
        executorFormFieldId: [s.executorFormFieldId ?? null],
        notifyOnArrival: [s.notifyOnArrival],
        sendPdf: [s.sendPdf],
        actions: this.fb.array(s.actions.map(a => this.buildActionGroup(a, s.stepNumber)))
      });
      this.applyExecutorValidators(grp);
      this.stepsArray.push(grp);
    }
  }

  private buildActionGroup(a: import('../../../core/models/process-step.model').ProcessStepActionDto, stepNumber: number): FormGroup {
    const isCanonical = stepNumber === 1 && this.CANONICAL_KEYS.includes(a.actionKey);
    return this.fb.group({
      id: [a.id ?? null],
      actionKey: [{ value: a.actionKey, disabled: isCanonical }, [Validators.required, Validators.maxLength(30)]],
      actionLabel: [a.actionLabel, [Validators.required, Validators.maxLength(100)]],
      transitionType: [{ value: a.transitionType, disabled: isCanonical }, Validators.required],
      targetStepNumber: [a.targetStepNumber ?? null]
    });
  }

  /**
   * Ajusta validators dos ids de executor conforme o tipo selecionado.
   * Sem isso, "Usuario" sem id seleciondo passaria pelo FE e seria barrado só no BE.
   */
  private applyExecutorValidators(grp: FormGroup) {
    const type = grp.get('executorType')!.value as ProcessExecutorType;
    const user = grp.get('executorUserId')!;
    const role = grp.get('executorRoleId')!;
    const field = grp.get('executorFormFieldId')!;

    user.clearValidators(); role.clearValidators(); field.clearValidators();

    switch (type) {
      case 'Usuario': user.setValidators([Validators.required]); break;
      case 'Papel':   role.setValidators([Validators.required]); break;
      case 'Cliente': field.setValidators([Validators.required]); break;
    }
    user.updateValueAndValidity({ emitEvent: false });
    role.updateValueAndValidity({ emitEvent: false });
    field.updateValueAndValidity({ emitEvent: false });
  }

  // ---------- Event handlers ----------
  onExecutorTypeChange(stepIndex: number) {
    const grp = this.stepsArray.at(stepIndex) as FormGroup;
    // Limpa ids antigos pra não vazar config inválida no save.
    grp.patchValue({ executorUserId: null, executorRoleId: null, executorFormFieldId: null });
    this.applyExecutorValidators(grp);
  }

  onTransitionChange(stepIndex: number, actionIndex: number) {
    const a = this.actionsOf(stepIndex).at(actionIndex) as FormGroup;
    if (a.value.transitionType !== 'VoltarParaEtapa') {
      a.patchValue({ targetStepNumber: null });
    }
  }

  addAction(stepIndex: number) {
    this.actionsOf(stepIndex).push(this.buildActionGroup({
      actionKey: '',
      actionLabel: '',
      transitionType: 'Avancar' as ProcessStepTransition,
      targetStepNumber: null
    }, stepIndex + 1));
  }

  removeAction(stepIndex: number, actionIndex: number) {
    this.actionsOf(stepIndex).removeAt(actionIndex);
  }

  // ---------- Save ----------
  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Corrija os erros antes de salvar.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    this.saving.set(true);
    // getRawValue para incluir controles disabled (etapa 1).
    const payload = this.form.getRawValue() as { steps: ProcessStepDto[] };

    this.stepService.save(this.processId(), payload).subscribe({
      next: res => {
        this.saving.set(false);
        this.buildForm(res.steps); // recarrega para refletir ids gerados
        this.snack.open('Etapas salvas com sucesso.', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.error?.title ?? 'Erro ao salvar etapas.';
        this.snack.open(msg, 'OK', { duration: 6000, panelClass: 'snack-error' });
      }
    });
  }

  // ---------- Display helpers ----------
  isStepEnabled(stepIndex: number): boolean {
    return (this.stepsArray.at(stepIndex) as FormGroup).get('isEnabled')!.value;
  }
  isCanonicalAction(actionIndex: number): boolean {
    // Sempre dentro do contexto da etapa 1.
    const a = this.actionsOf(0).at(actionIndex) as FormGroup | undefined;
    if (!a) return false;
    return this.CANONICAL_KEYS.includes(a.getRawValue().actionKey);
  }
  canAddActionToStep1(): boolean {
    // Etapa 1: pode adicionar ações extras desde que as canônicas existam.
    return this.CANONICAL_KEYS.every(k =>
      (this.actionsOf(0).controls as FormGroup[]).some(c => c.getRawValue().actionKey === k));
  }
  previousStepNumbers(currentStep: number): number[] {
    const out: number[] = [];
    for (let n = 1; n < currentStep; n++) {
      if ((this.stepsArray.at(n - 1) as FormGroup).get('isEnabled')!.value) out.push(n);
    }
    return out;
  }
  stepTitle(stepNumber: number): string {
    return { 1: 'Elaborar Orçamento', 2: 'Revisar Orçamento', 3: 'Aprovar Orçamento' }[stepNumber] ?? '';
  }
  stepIcon(stepNumber: number): string {
    return { 1: 'edit_note', 2: 'rule', 3: 'verified' }[stepNumber] ?? 'help';
  }
  executorIcon(type: ProcessExecutorType): string {
    return EXECUTOR_TYPES.find(e => e.value === type)?.icon ?? 'help';
  }
  executorSummary(step: { executorType: ProcessExecutorType; executorUserId?: number | null; executorRoleId?: number | null; executorFormFieldId?: string | null }): string {
    switch (step.executorType) {
      case 'Solicitante': return 'Solicitante';
      case 'Usuario': return this.users().find(u => u.id === step.executorUserId)?.name ?? 'Usuário?';
      case 'Papel': return this.roles().find(r => r.id === step.executorRoleId)?.description ?? 'Papel?';
      case 'Cliente': return `Campo: ${step.executorFormFieldId ?? '?'}`;
    }
  }

  /**
   * Sinal reativo que ouve `form.valueChanges` — sem isso, o `computed` abaixo
   * jamais detectaria mudanças nos controles (computed só rastreia dependências
   * de signal, não de Observable/Form). `startWith(null)` força emissão inicial
   * para a primeira renderização do diagrama.
   */
  private readonly formChanges = toSignal(
    this.form.valueChanges.pipe(startWith(null)),
    { initialValue: null }
  );

  enabledStepsView = computed(() => {
    this.formChanges();           // assinatura — dispara recompute a cada mudança
    const raw = this.form.getRawValue() as { steps: ProcessStepDto[] };
    return raw.steps
      .filter(s => s.isEnabled)
      .map(s => ({
        ...s,
        isFinal: s.actions.some(a => a.transitionType === 'Finalizar'),
        backTargets: s.actions
          .filter(a => a.transitionType === 'VoltarParaEtapa' && a.targetStepNumber)
          .map(a => a.targetStepNumber!)
      }));
  });
}
