import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { TranslocoModule } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RoleService } from '../../core/services/role.service';
import { RoleListItem } from '../../core/models/role.model';

/**
 * Listagem de papéis com **infinite scroll**.
 * Estratégia: detecta o evento `scroll` no container e dispara nova página
 * quando o usuário se aproxima do fim. Mais simples que CDK virtual scroll
 * e suficiente para até alguns milhares de registros.
 *
 * Busca por descrição com debounce de 300ms para não bombardear a API.
 */
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('roles.title') }}</h2>
          <p class="page-subtitle">{{ t('roles.subtitle') }}</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/roles/new">
          <mat-icon>add</mat-icon> {{ t('roles.new') }}
        </a>
      </div>

      <mat-card class="filter-card">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ t('common.search') }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchCtrl" [placeholder]="t('roles.searchPlaceholder')" />
        </mat-form-field>
      </mat-card>

      <mat-card class="table-card">
        <div #scrollContainer class="scroll-area" (scroll)="onScroll($event)">
          <table mat-table [dataSource]="items()" class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let r">{{ r.id }}</td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>{{ t('roles.description') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.description }}</td>
            </ng-container>

            <ng-container matColumnDef="users">
              <th mat-header-cell *matHeaderCellDef>{{ t('roles.users') }}</th>
              <td mat-cell *matCellDef="let r">
                <mat-icon class="users-icon">group</mat-icon>
                <span>{{ r.usersCount }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ t('roles.status') }}</th>
              <td mat-cell *matCellDef="let r">
                <mat-chip [class]="r.isActive ? 'chip-active' : 'chip-inactive'">
                  {{ r.isActive ? t('common.active') : t('common.inactive') }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>{{ t('common.actions') }}</th>
              <td mat-cell *matCellDef="let r">
                <a mat-icon-button [routerLink]="['/roles', r.id]" [title]="t('common.edit')">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button color="warn" [title]="t('common.delete')" (click)="confirmDelete(r)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (loadingMore()) {
            <div class="loading-row">
              <mat-spinner diameter="24" />
              <span>{{ t('common.loading') }}</span>
            </div>
          }

          @if (!loading() && items().length === 0) {
            <div class="no-data">{{ t('roles.empty') }}</div>
          }

          @if (!hasMore() && items().length > 0) {
            <div class="end-row">{{ t('roles.endOfList', { count: total() }) }}</div>
          }
        </div>
      </mat-card>
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
    .users-icon  { vertical-align:middle; font-size:18px; width:18px; height:18px; margin-right:4px; color:#7c3aed; }
    .loading-row { display:flex; justify-content:center; align-items:center; gap:8px; padding:16px; color:rgba(0,0,0,.55); }
    .end-row     { text-align:center; padding:16px; color:rgba(0,0,0,.4); font-size:13px; }
    .no-data     { text-align:center; padding:40px; color:rgba(0,0,0,.4); }
    .chip-active   { background:#dcfce7 !important; color:#15803d !important; }
    .chip-inactive { background:#fee2e2 !important; color:#b91c1c !important; }
  `]
})
export class RolesComponent implements OnInit {
  private roleService = inject(RoleService);
  private snack = inject(MatSnackBar);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  columns = ['id', 'description', 'users', 'status', 'actions'];
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  items = signal<RoleListItem[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 30;
  loading = signal(false);
  loadingMore = signal(false);
  hasMore = computed(() => this.items().length < this.total());

  ngOnInit() {
    this.loadFirstPage();

    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadFirstPage());
  }

  /** Sentinel ~150px do fim → carrega próxima página. Evita disparos múltiplos com `loadingMore`. */
  onScroll(event: Event) {
    if (this.loadingMore() || !this.hasMore()) return;
    const el = event.target as HTMLDivElement;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 150) this.loadNextPage();
  }

  private loadFirstPage() {
    this.loading.set(true);
    this.page.set(1);
    this.roleService.getPaged(1, this.pageSize, this.searchCtrl.value).subscribe({
      next: res => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar papéis.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  private loadNextPage() {
    this.loadingMore.set(true);
    const next = this.page() + 1;
    this.roleService.getPaged(next, this.pageSize, this.searchCtrl.value).subscribe({
      next: res => {
        this.items.update(curr => [...curr, ...res.items]);
        this.total.set(res.total);
        this.page.set(next);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.snack.open('Erro ao carregar mais papéis.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  confirmDelete(role: RoleListItem) {
    if (!confirm(`Excluir o papel "${role.description}"?`)) return;
    this.roleService.delete(role.id).subscribe({
      next: () => {
        this.snack.open('Papel removido.', 'OK', { duration: 3000 });
        this.loadFirstPage();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao remover papel.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
