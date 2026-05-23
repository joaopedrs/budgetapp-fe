import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RoleService } from '../../core/services/role.service';
import { RoleUser } from '../../core/models/role.model';
import { User } from '../../core/models/user.model';

/**
 * Formulário de criação/edição de papel.
 *
 * Tabelas de usuários:
 * - **Selecionados**: lista local que vai no payload `userIds[]`. Operação puramente em memória.
 * - **Disponíveis**: paginada via API (infinite scroll), com filtro por nome/e-mail.
 *   No modo edição, exclui automaticamente os já vinculados (param `roleId`).
 *   No modo criação, exclui os já adicionados em memória (filtragem client-side).
 *
 * O salvar manda a lista completa de `userIds` — backend faz diff add/remove.
 */
@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatTableModule,
    MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule, MatDividerModule,
    TranslocoModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEdit() ? t('roles.edit') : t('roles.new') }}</h2>
          <p class="page-subtitle">{{ t('roles.subtitle') }}</p>
        </div>
        <a mat-stroked-button routerLink="/roles">
          <mat-icon>arrow_back</mat-icon> {{ t('common.back') }}
        </a>
      </div>

      @if (loading()) {
        <mat-card><div class="loading"><mat-spinner diameter="40" /></div></mat-card>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-card class="info-card">
            <h3>{{ t('roles.info') }}</h3>

            @if (isEdit()) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>ID</mat-label>
                <input matInput [value]="roleId()" disabled />
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('roles.description') }}</mat-label>
              <input matInput formControlName="description" maxlength="200" />
              @if (form.get('description')?.hasError('required') && form.get('description')?.touched) {
                <mat-error>{{ t('roles.errors.descriptionRequired') }}</mat-error>
              }
              @if (form.get('description')?.hasError('minlength') && form.get('description')?.touched) {
                <mat-error>{{ t('roles.errors.descriptionMin') }}</mat-error>
              }
            </mat-form-field>

            <mat-slide-toggle formControlName="isActive" color="primary">
              {{ form.value.isActive ? t('common.active') : t('common.inactive') }}
            </mat-slide-toggle>
          </mat-card>

          <mat-card class="users-card">
            <div class="users-header">
              <h3>{{ t('roles.selected') }} ({{ selectedUsers().length }})</h3>
              <small>{{ t('roles.selectedHint') }}</small>
            </div>

            @if (selectedUsers().length === 0) {
              <div class="no-data">{{ t('roles.noneSelected') }}</div>
            } @else {
              <table mat-table [dataSource]="selectedUsers()" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ t('users.name') }}</th>
                  <td mat-cell *matCellDef="let u">{{ u.name }}</td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>{{ t('users.email') }}</th>
                  <td mat-cell *matCellDef="let u">{{ u.email }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let u">
                    <button mat-icon-button type="button" color="warn"
                            [title]="t('roles.remove')" (click)="removeUser(u)">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="selectedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: selectedColumns;"></tr>
              </table>
            }
          </mat-card>

          <mat-card class="users-card">
            <div class="users-header">
              <h3>{{ t('roles.available') }}</h3>
              <small>{{ t('roles.availableHint') }}</small>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('common.search') }}</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [formControl]="availableSearchCtrl"
                     [placeholder]="t('roles.searchUserPlaceholder')" />
            </mat-form-field>

            <div #availContainer class="scroll-area" (scroll)="onAvailScroll($event)">
              <table mat-table [dataSource]="availableFiltered()" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ t('users.name') }}</th>
                  <td mat-cell *matCellDef="let u">{{ u.name }}</td>
                </ng-container>
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>{{ t('users.email') }}</th>
                  <td mat-cell *matCellDef="let u">{{ u.email }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ t('users.status') }}</th>
                  <td mat-cell *matCellDef="let u">
                    <mat-chip [class]="u.isActive ? 'chip-active' : 'chip-inactive'">
                      {{ u.isActive ? t('common.active') : t('common.inactive') }}
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let u">
                    <button mat-icon-button type="button" color="primary"
                            [title]="t('roles.add')" (click)="addUser(u)">
                      <mat-icon>person_add</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="availableColumns; sticky: true"></tr>
                <tr mat-row *matRowDef="let row; columns: availableColumns;"></tr>
              </table>

              @if (availLoadingMore()) {
                <div class="loading-row"><mat-spinner diameter="20" /><span>{{ t('common.loading') }}</span></div>
              }
              @if (!availLoading() && availableFiltered().length === 0) {
                <div class="no-data">{{ t('roles.noAvailable') }}</div>
              }
            </div>
          </mat-card>

          <div class="form-actions">
            <a mat-stroked-button routerLink="/roles" type="button">{{ t('common.cancel') }}</a>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
              @if (saving()) { <mat-spinner diameter="20" /> }
              @else { {{ t('common.save') }} }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .loading { display:flex; justify-content:center; padding:40px; }
    .info-card, .users-card { padding:20px; margin-bottom:16px; }
    .info-card h3, .users-card h3 { margin:0 0 12px; font-size:16px; font-weight:600; color:#1e1145; }
    .users-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
    .users-header small { color:rgba(0,0,0,.5); }
    .full-width { width:100%; }
    .scroll-area { max-height:380px; overflow-y:auto; border:1px solid rgba(0,0,0,.08); border-radius:8px; }
    .no-data { text-align:center; padding:24px; color:rgba(0,0,0,.4); font-size:14px; }
    .loading-row { display:flex; justify-content:center; align-items:center; gap:8px; padding:12px; color:rgba(0,0,0,.55); }
    .form-actions { display:flex; justify-content:flex-end; gap:12px; margin-top:8px; }
    .chip-active   { background:#dcfce7 !important; color:#15803d !important; }
    .chip-inactive { background:#fee2e2 !important; color:#b91c1c !important; }
  `]
})
export class RoleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  @ViewChild('availContainer') availContainer!: ElementRef<HTMLDivElement>;

  // Mode
  roleId = signal<number | null>(null);
  isEdit = computed(() => this.roleId() !== null);

  // State
  loading = signal(false);
  saving = signal(false);

  // Selected (in-memory)
  selectedUsers = signal<RoleUser[]>([]);
  selectedColumns = ['name', 'email', 'actions'];

  // Available (paginated)
  availableUsers = signal<User[]>([]);
  availTotal = signal(0);
  availPage = signal(1);
  availPageSize = 30;
  availLoading = signal(false);
  availLoadingMore = signal(false);
  availHasMore = computed(() => this.availableUsers().length < this.availTotal());
  availableSearchCtrl = new FormControl<string>('', { nonNullable: true });

  /**
   * Lista exibida na tabela "Disponíveis" filtrando localmente os já selecionados.
   * Filtro client-side complementa o `excludeIds` que o BE faz só na edição.
   */
  availableFiltered = computed(() => {
    const selectedIds = new Set(this.selectedUsers().map(u => u.id));
    return this.availableUsers().filter(u => !selectedIds.has(u.id));
  });
  availableColumns = ['name', 'email', 'status', 'actions'];

  form = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    isActive: [true]
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.roleId.set(+idParam);
      this.loadRole();
    } else {
      this.loadAvailable(true);
    }

    this.availableSearchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadAvailable(true));
  }

  private loadRole() {
    this.loading.set(true);
    this.roleService.getById(this.roleId()!).subscribe({
      next: role => {
        this.form.patchValue({ description: role.description, isActive: role.isActive });
        this.selectedUsers.set(role.users);
        this.loadAvailable(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar papel.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.router.navigate(['/roles']);
      }
    });
  }

  private loadAvailable(reset: boolean) {
    if (reset) {
      this.availLoading.set(true);
      this.availPage.set(1);
    } else {
      this.availLoadingMore.set(true);
    }

    const page = reset ? 1 : this.availPage() + 1;
    this.roleService.getAvailableUsers(page, this.availPageSize, this.availableSearchCtrl.value, this.roleId())
      .subscribe({
        next: res => {
          this.availTotal.set(res.total);
          this.availPage.set(page);
          if (reset) {
            this.availableUsers.set(res.items);
            this.availLoading.set(false);
          } else {
            this.availableUsers.update(curr => [...curr, ...res.items]);
            this.availLoadingMore.set(false);
          }
        },
        error: () => {
          this.availLoading.set(false);
          this.availLoadingMore.set(false);
          this.snack.open('Erro ao carregar usuários.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        }
      });
  }

  onAvailScroll(event: Event) {
    if (this.availLoadingMore() || !this.availHasMore()) return;
    const el = event.target as HTMLDivElement;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < 150) this.loadAvailable(false);
  }

  addUser(user: User) {
    if (this.selectedUsers().some(s => s.id === user.id)) return;
    this.selectedUsers.update(curr => [...curr, {
      id: user.id, name: user.name, email: user.email, isActive: user.isActive
    }]);
  }

  removeUser(user: RoleUser) {
    this.selectedUsers.update(curr => curr.filter(s => s.id !== user.id));
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = {
      description: this.form.value.description!,
      userIds: this.selectedUsers().map(u => u.id)
    };

    const obs = this.isEdit()
      ? this.roleService.update(this.roleId()!, { ...payload, isActive: this.form.value.isActive! })
      : this.roleService.create(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.isEdit() ? 'Papel atualizado.' : 'Papel criado.', 'OK', { duration: 3000 });
        this.router.navigate(['/roles']);
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar papel.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }
}
