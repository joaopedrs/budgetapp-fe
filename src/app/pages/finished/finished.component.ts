import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslocoModule } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProcessInstanceService } from '../../core/services/process-instance.service';
import { ProcessService } from '../../core/services/process.service';
import { FinishedFilter, FinishedInstanceItem } from '../../core/models/finished-instance.model';
import { ProcessInstanceStatus } from '../../core/models/process-instance.model';
import { Process } from '../../core/models/process.model';

/**
 * Tela "Finalizados" — espelha o layout da inbox, mas para instâncias com
 * status final (Finalizado ou Cancelado). Suporta filtros combinados:
 *   - Processo (dropdown carregado uma vez)
 *   - Código do fluxo (id da instância — input numérico)
 *   - Status (Finalizado/Cancelado)
 *   - Data de abertura / finalização (datepickers, range from–to)
 *
 * Filtros mudam → resetam a paginação para a página 1 (debounce 300ms).
 * Clique na linha → navega para a tela de execução, que já mostra tudo
 * bloqueado quando status !== EmAndamento (`disabled` no DynamicForm,
 * `availableActions` vazias).
 */
@Component({
  selector: 'app-finished',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, TranslocoModule, DatePipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatExpansionModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('finished.title') }}</h2>
          <p class="page-subtitle">{{ t('finished.subtitle') }}</p>
        </div>
      </div>

      <mat-card class="filter-card">
        <mat-expansion-panel [expanded]="true" class="filter-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>filter_list</mat-icon> {{ t('finished.filters') }}
              @if (activeFilterCount() > 0) {
                <mat-chip class="chip-count">{{ activeFilterCount() }}</mat-chip>
              }
            </mat-panel-title>
          </mat-expansion-panel-header>

          <form [formGroup]="filterForm" class="filter-grid">
            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.process') }}</mat-label>
              <mat-select formControlName="processId">
                <mat-option [value]="null">{{ t('finished.allProcesses') }}</mat-option>
                @for (p of processes(); track p.id) {
                  <mat-option [value]="p.id">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.code') }}</mat-label>
              <input matInput type="number" formControlName="instanceId" placeholder="#123" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.status') }}</mat-label>
              <mat-select formControlName="status">
                <mat-option [value]="null">{{ t('finished.allStatuses') }}</mat-option>
                <mat-option value="Finalizado">{{ t('execution.statuses.Finalizado') }}</mat-option>
                <mat-option value="Cancelado">{{ t('execution.statuses.Cancelado') }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.createdFrom') }}</mat-label>
              <input matInput [matDatepicker]="dpCreatedFrom" formControlName="createdFrom" />
              <mat-datepicker-toggle matIconSuffix [for]="dpCreatedFrom" />
              <mat-datepicker #dpCreatedFrom />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.createdTo') }}</mat-label>
              <input matInput [matDatepicker]="dpCreatedTo" formControlName="createdTo" />
              <mat-datepicker-toggle matIconSuffix [for]="dpCreatedTo" />
              <mat-datepicker #dpCreatedTo />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.finishedFrom') }}</mat-label>
              <input matInput [matDatepicker]="dpFinishedFrom" formControlName="finishedFrom" />
              <mat-datepicker-toggle matIconSuffix [for]="dpFinishedFrom" />
              <mat-datepicker #dpFinishedFrom />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('finished.finishedTo') }}</mat-label>
              <input matInput [matDatepicker]="dpFinishedTo" formControlName="finishedTo" />
              <mat-datepicker-toggle matIconSuffix [for]="dpFinishedTo" />
              <mat-datepicker #dpFinishedTo />
            </mat-form-field>

            <div class="filter-actions">
              <button mat-stroked-button type="button" (click)="clearFilters()" [disabled]="activeFilterCount() === 0">
                <mat-icon>clear</mat-icon> {{ t('finished.clearFilters') }}
              </button>
            </div>
          </form>
        </mat-expansion-panel>
      </mat-card>

      <mat-card class="table-card">
        <div #scrollContainer class="scroll-area" (scroll)="onScroll($event)">
          @if (loading()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else {
            <table mat-table [dataSource]="items()" class="full-width">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.code') }}</th>
                <td mat-cell *matCellDef="let i">#{{ i.id }}</td>
              </ng-container>

              <ng-container matColumnDef="process">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.process') }}</th>
                <td mat-cell *matCellDef="let i">{{ i.processName }}</td>
              </ng-container>

              <ng-container matColumnDef="requester">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.requester') }}</th>
                <td mat-cell *matCellDef="let i">{{ i.requesterUserName }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.status') }}</th>
                <td mat-cell *matCellDef="let i">
                  <mat-chip [class]="statusChipClass(i.status)">
                    {{ t('execution.statuses.' + i.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.openedAt') }}</th>
                <td mat-cell *matCellDef="let i">{{ i.createdAt | date:'short' }}</td>
              </ng-container>

              <ng-container matColumnDef="finishedAt">
                <th mat-header-cell *matHeaderCellDef>{{ t('finished.finishedAt') }}</th>
                <td mat-cell *matCellDef="let i">{{ i.finishedAt | date:'short' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let i">
                  <a mat-stroked-button [routerLink]="['/process-instances', i.id]">
                    {{ t('finished.view') }}
                    <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                  </a>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>

            @if (loadingMore()) {
              <div class="loading-row"><mat-spinner diameter="24" /></div>
            }
            @if (items().length === 0) {
              <div class="empty">
                <mat-icon>history_toggle_off</mat-icon>
                <p>{{ t('finished.empty') }}</p>
              </div>
            }
            @if (!hasMore() && items().length > 0) {
              <div class="end-row">{{ t('finished.endOfList', { count: total() }) }}</div>
            }
          }
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }

    .filter-card { padding:0; margin-bottom:16px; }
    .filter-panel { box-shadow: none !important; background: transparent; }
    .filter-grid {
      display:grid; gap:12px;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      padding: 12px 0 0;
    }
    .filter-actions { grid-column: 1 / -1; display:flex; justify-content:flex-end; }
    .chip-count { background:#7c3aed !important; color:#fff !important; min-height:20px !important; font-size:11px !important; margin-left:8px !important; }

    .table-card  { padding:0; overflow:hidden; }
    .full-width  { width:100%; }
    .scroll-area { max-height:calc(100vh - 420px); overflow-y:auto; }
    .loading     { display:flex; justify-content:center; padding:40px; }
    .loading-row { display:flex; justify-content:center; padding:12px; }
    .end-row     { text-align:center; padding:16px; color:rgba(0,0,0,.4); font-size:13px; }
    .empty       { text-align:center; padding:48px 16px; color:rgba(0,0,0,.4); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; opacity:.4; }

    .chip-finalizado { background:#dcfce7 !important; color:#15803d !important; font-size:12px !important; min-height:22px !important; }
    .chip-cancelado  { background:#fee2e2 !important; color:#b91c1c !important; font-size:12px !important; min-height:22px !important; }
  `]
})
export class FinishedComponent implements OnInit {
  private instanceService = inject(ProcessInstanceService);
  private processService = inject(ProcessService);
  private snack = inject(MatSnackBar);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  columns = ['code', 'process', 'requester', 'status', 'createdAt', 'finishedAt', 'actions'];

  /**
   * Form de filtros. Cada controle é opcional (null = ignorar).
   * `valueChanges` reseta a paginação para a página 1 com debounce de 300ms
   * — evita disparar uma request por keystroke no campo de código.
   */
  filterForm = new FormGroup({
    processId:    new FormControl<number | null>(null),
    instanceId:   new FormControl<number | null>(null),
    status:       new FormControl<ProcessInstanceStatus | null>(null),
    createdFrom:  new FormControl<Date | null>(null),
    createdTo:    new FormControl<Date | null>(null),
    finishedFrom: new FormControl<Date | null>(null),
    finishedTo:   new FormControl<Date | null>(null)
  });

  /** Signal-mirror dos filtros para o computed de contagem de ativos. */
  private filterValues = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    { initialValue: this.filterForm.value }
  );
  activeFilterCount = computed(() =>
    Object.values(this.filterValues() ?? {})
      .filter(v => v !== null && v !== undefined && (v as unknown) !== '').length);

  // Listagem (infinite scroll)
  processes = signal<Process[]>([]);
  items     = signal<FinishedInstanceItem[]>([]);
  total     = signal(0);
  page      = signal(1);
  pageSize  = 30;
  loading     = signal(false);
  loadingMore = signal(false);
  hasMore = computed(() => this.items().length < this.total());

  ngOnInit() {
    // Carrega processos uma vez para alimentar o dropdown de filtro.
    this.processService.getAll().subscribe({
      next: list => this.processes.set(list),
      error: () => {/* dropdown apenas — silencia */}
    });

    this.loadFirstPage();

    // Filtros → debounce → reset pra primeira página.
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => this.loadFirstPage());
  }

  onScroll(event: Event) {
    if (this.loadingMore() || !this.hasMore()) return;
    const el = event.target as HTMLDivElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) this.loadNextPage();
  }

  private loadFirstPage() {
    this.loading.set(true);
    this.page.set(1);
    this.instanceService.getFinished(1, this.pageSize, this.buildFilter()).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Erro ao carregar finalizados.', 'OK', { duration: 4000, panelClass: 'snack-error' }); }
    });
  }

  private loadNextPage() {
    this.loadingMore.set(true);
    const next = this.page() + 1;
    this.instanceService.getFinished(next, this.pageSize, this.buildFilter()).subscribe({
      next: r => {
        this.items.update(curr => [...curr, ...r.items]);
        this.total.set(r.total);
        this.page.set(next);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false)
    });
  }

  /** Converte os valores do FormGroup para o shape esperado pelo service (datas → ISO yyyy-MM-dd). */
  private buildFilter(): FinishedFilter {
    const v = this.filterForm.value;
    return {
      processId:    v.processId    ?? null,
      instanceId:   v.instanceId   ?? null,
      status:       v.status       ?? null,
      createdFrom:  this.toIsoDate(v.createdFrom),
      createdTo:    this.toIsoDate(v.createdTo),
      finishedFrom: this.toIsoDate(v.finishedFrom),
      finishedTo:   this.toIsoDate(v.finishedTo)
    };
  }

  /** Materializa Date → "yyyy-MM-dd" (sem timezone). Backend trata como UTC date-only. */
  private toIsoDate(d: Date | null | undefined): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  clearFilters() {
    this.filterForm.reset({
      processId: null, instanceId: null, status: null,
      createdFrom: null, createdTo: null, finishedFrom: null, finishedTo: null
    });
  }

  statusChipClass(s: ProcessInstanceStatus): string {
    return s === 'Finalizado' ? 'chip-finalizado' : 'chip-cancelado';
  }
}
