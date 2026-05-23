import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslocoModule } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProcessInstanceService } from '../../core/services/process-instance.service';
import { ProcessService } from '../../core/services/process.service';
import { InboxItemDto } from '../../core/models/process-instance.model';
import { Process } from '../../core/models/process.model';

/**
 * Caixa de entrada do usuário corrente.
 * Lista tasks pendentes (atribuídas direto OU via papel), com infinite scroll.
 * Inclui um botão de "Nova solicitação" que dispara a criação de instância
 * a partir de um processo selecionado.
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, TranslocoModule, DatePipe,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatSelectModule, MatDialogModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('inbox.title') }}</h2>
          <p class="page-subtitle">{{ t('inbox.subtitle') }}</p>
        </div>
        <button mat-flat-button color="primary" (click)="openNewRequest()">
          <mat-icon>add</mat-icon> {{ t('inbox.newRequest') }}
        </button>
      </div>

      <mat-card class="filter-card">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ t('common.search') }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchCtrl" [placeholder]="t('inbox.searchPlaceholder')" />
        </mat-form-field>
      </mat-card>

      <mat-card class="table-card">
        <div #scrollContainer class="scroll-area" (scroll)="onScroll($event)">
          @if (loading()) {
            <div class="loading"><mat-spinner diameter="40" /></div>
          } @else {
            <table mat-table [dataSource]="items()" class="full-width">
              <ng-container matColumnDef="process">
                <th mat-header-cell *matHeaderCellDef>{{ t('inbox.process') }}</th>
                <td mat-cell *matCellDef="let i">
                  <div class="cell-primary">{{ i.processName }}</div>
                  <div class="cell-secondary">#{{ i.processInstanceId }} · etapa {{ i.stepNumber }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="requester">
                <th mat-header-cell *matHeaderCellDef>{{ t('inbox.requester') }}</th>
                <td mat-cell *matCellDef="let i">{{ i.requesterUserName }}</td>
              </ng-container>

              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>{{ t('inbox.assignedBy') }}</th>
                <td mat-cell *matCellDef="let i">
                  <mat-chip class="chip-reason">{{ i.assignmentReason }}</mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>{{ t('inbox.createdAt') }}</th>
                <td mat-cell *matCellDef="let i">
                  {{ i.createdAt | date:'short' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let i">
                  <a mat-flat-button color="primary"
                     [routerLink]="['/process-instances', i.processInstanceId]">
                    {{ t('inbox.open') }}
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
                <mat-icon>inbox</mat-icon>
                <p>{{ t('inbox.empty') }}</p>
              </div>
            }
            @if (!hasMore() && items().length > 0) {
              <div class="end-row">{{ t('inbox.endOfList', { count: total() }) }}</div>
            }
          }
        </div>
      </mat-card>

      <!-- "Nova solicitação": modal inline simples (dropdown de processos ativos). -->
      @if (showNewModal()) {
        <div class="modal-overlay" (click)="closeNewRequest()">
          <mat-card class="modal-card" (click)="$event.stopPropagation()">
            <h3>{{ t('inbox.newRequest') }}</h3>
            <p class="hint">{{ t('inbox.newRequestHint') }}</p>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('inbox.selectProcess') }}</mat-label>
              <mat-select [formControl]="processCtrl">
                @for (p of processes(); track p.id) {
                  <mat-option [value]="p.id" [disabled]="!p.isActive">
                    {{ p.name }} (v{{ p.currentVersion }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="modal-actions">
              <button mat-stroked-button (click)="closeNewRequest()">{{ t('common.cancel') }}</button>
              <button mat-flat-button color="primary"
                      [disabled]="!processCtrl.value || creating()"
                      (click)="createInstance()">
                @if (creating()) { <mat-spinner diameter="20" /> }
                @else { <ng-container>{{ t('inbox.start') }}</ng-container> }
              </button>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .filter-card { padding:16px 16px 0; margin-bottom:16px; }
    .full-width  { width:100%; }
    .table-card  { padding:0; overflow:hidden; }
    .scroll-area { max-height:calc(100vh - 320px); overflow-y:auto; }
    .loading     { display:flex; justify-content:center; padding:40px; }
    .loading-row { display:flex; justify-content:center; padding:12px; }
    .end-row     { text-align:center; padding:16px; color:rgba(0,0,0,.4); font-size:13px; }
    .empty       { text-align:center; padding:48px 16px; color:rgba(0,0,0,.4); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; opacity:.4; }
    .cell-primary { font-weight:500; }
    .cell-secondary { font-size:12px; color:rgba(0,0,0,.55); }
    .chip-reason { background:#ede9fe !important; color:#5b21b6 !important; font-size:12px !important; min-height:22px !important; }

    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:1000;
      display:flex; justify-content:center; align-items:center;
    }
    .modal-card { padding:24px; min-width:400px; max-width:90vw; }
    .modal-card h3 { margin:0 0 8px; }
    .hint { color:rgba(0,0,0,.55); margin:0 0 16px; font-size:14px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:12px; }
  `]
})
export class InboxComponent implements OnInit {
  private instanceService = inject(ProcessInstanceService);
  private processService = inject(ProcessService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  columns = ['process', 'requester', 'reason', 'createdAt', 'actions'];
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  items = signal<InboxItemDto[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 30;
  loading = signal(false);
  loadingMore = signal(false);
  hasMore = computed(() => this.items().length < this.total());

  // Modal "Nova solicitação"
  showNewModal = signal(false);
  processes = signal<Process[]>([]);
  processCtrl = new FormControl<number | null>(null);
  creating = signal(false);

  ngOnInit() {
    this.loadFirstPage();
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
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
    this.instanceService.getInbox(1, this.pageSize, this.searchCtrl.value).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Erro ao carregar inbox.', 'OK', { duration: 4000, panelClass: 'snack-error' }); }
    });
  }

  private loadNextPage() {
    this.loadingMore.set(true);
    const next = this.page() + 1;
    this.instanceService.getInbox(next, this.pageSize, this.searchCtrl.value).subscribe({
      next: r => {
        this.items.update(curr => [...curr, ...r.items]);
        this.total.set(r.total);
        this.page.set(next);
        this.loadingMore.set(false);
      },
      error: () => { this.loadingMore.set(false); }
    });
  }

  openNewRequest() {
    this.showNewModal.set(true);
    this.processCtrl.reset();
    // Carrega processos ativos sob demanda.
    this.processService.getAll().subscribe({
      next: list => this.processes.set(list.filter(p => p.isActive)),
      error: () => this.snack.open('Erro ao carregar processos.', 'OK', { duration: 3000, panelClass: 'snack-error' })
    });
  }

  closeNewRequest() { this.showNewModal.set(false); }

  createInstance() {
    const pid = this.processCtrl.value;
    if (!pid) return;
    this.creating.set(true);
    this.instanceService.create({ processId: pid }).subscribe({
      next: r => {
        this.creating.set(false);
        this.closeNewRequest();
        // Redireciona direto para a tela de execução da instância criada.
        this.router.navigate(['/process-instances', r.id]);
      },
      error: err => {
        this.creating.set(false);
        const msg = err?.error?.message ?? err?.error?.error ?? 'Erro ao criar instância.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }
}
