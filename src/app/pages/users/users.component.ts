import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, RouterLink, TranslocoModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('users.title') }}</h2>
          <p class="page-subtitle">{{ t('users.subtitle') }}</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/users/new">
          <mat-icon>add</mat-icon> {{ t('users.new') }}
        </a>
      </div>

      <mat-card>
        @if (loading()) {
          <div class="loading-center"><mat-spinner diameter="40" /></div>
        } @else {
          <table mat-table [dataSource]="users()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ t('users.name') }}</th>
              <td mat-cell *matCellDef="let u">{{ u.name }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>{{ t('users.email') }}</th>
              <td mat-cell *matCellDef="let u">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>{{ t('users.role') }}</th>
              <td mat-cell *matCellDef="let u">
                <mat-chip [class]="u.role === 'Admin' ? 'chip-admin' : 'chip-user'">
                  {{ t('users.roles.' + u.role) }}
                </mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ t('users.status') }}</th>
              <td mat-cell *matCellDef="let u">
                <mat-chip [class]="u.isActive ? 'chip-active' : 'chip-inactive'">
                  {{ u.isActive ? t('users.active') : t('users.inactive') }}
                </mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>{{ t('users.actions') }}</th>
              <td mat-cell *matCellDef="let u">
                <a mat-icon-button [routerLink]="['/users', u.id]" [title]="t('common.edit')">
                  <mat-icon>edit</mat-icon>
                </a>
                <button mat-icon-button color="warn" (click)="deleteUser(u)" [title]="t('common.delete')">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (users().length === 0) {
            <div class="no-data">{{ t('users.empty') }}</div>
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
    .chip-admin { background: #ede9fe !important; color: #6d28d9 !important; }
    .chip-user  { background: #e0f2fe !important; color: #0369a1 !important; }
    .chip-active   { background: #dcfce7 !important; color: #15803d !important; }
    .chip-inactive { background: #fee2e2 !important; color: #b91c1c !important; }
  `]
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private snack = inject(MatSnackBar);

  columns = ['name', 'email', 'role', 'status', 'actions'];
  users = signal<User[]>([]);
  loading = signal(true);

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  deleteUser(user: User) {
    if (!confirm(`Excluir ${user.name}?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.snack.open('Usuário removido.', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.loadUsers();
      },
      error: () => this.snack.open('Erro ao excluir.', 'OK', { duration: 3000, panelClass: 'snack-error' })
    });
  }
}
