import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule } from '@jsverse/transloco';
import { TenantService } from '../../core/services/tenant.service';
import { TenantListItem } from '../../core/models/tenant.model';

/**
 * Listagem de tenants — restrita ao system tenant admin via 403 do BE.
 * Sem paginação (volume baixo no SaaS atual; revisar se passar de algumas centenas).
 */
@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    CommonModule, RouterLink, DatePipe, TranslocoModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('tenants.title') }}</h2>
          <p class="page-subtitle">{{ t('tenants.subtitle') }}</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/admin/tenants/new">
          <mat-icon>add</mat-icon> {{ t('tenants.new') }}
        </a>
      </div>

      <mat-card>
        @if (loading()) {
          <div class="loading"><mat-spinner diameter="40" /></div>
        } @else if (items().length === 0) {
          <div class="empty">
            <mat-icon>domain_disabled</mat-icon>
            <p>{{ t('tenants.empty') }}</p>
          </div>
        } @else {
          <table mat-table [dataSource]="items()" class="full-width">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.id') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.id }}</td>
            </ng-container>

            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.code') }}</th>
              <td mat-cell *matCellDef="let r">
                <code>{{ r.code }}</code>
                @if (r.isSystemTenant) {
                  <mat-chip class="chip-system">{{ t('tenants.system') }}</mat-chip>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.name') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.name }}</td>
            </ng-container>

            <ng-container matColumnDef="clientName">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.clientName') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.clientName || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="cnpj">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.cnpj') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.cnpj || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="lastAccess">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.lastAccess') }}</th>
              <td mat-cell *matCellDef="let r">
                {{ r.lastAccessAt ? (r.lastAccessAt | date:'short') : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.createdAt') }}</th>
              <td mat-cell *matCellDef="let r">{{ r.createdAt | date:'short' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ t('tenants.status') }}</th>
              <td mat-cell *matCellDef="let r">
                <mat-chip [class]="r.isActive ? 'chip-active' : 'chip-inactive'">
                  {{ r.isActive ? t('common.active') : t('common.inactive') }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <a mat-icon-button [routerLink]="['/admin/tenants', r.id]" [title]="t('common.edit')">
                  <mat-icon>edit</mat-icon>
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .full-width  { width:100%; }
    .loading     { display:flex; justify-content:center; padding:40px; }
    .empty       { text-align:center; padding:48px 16px; color:rgba(0,0,0,.4); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; opacity:.4; }
    .chip-active   { background:#dcfce7 !important; color:#15803d !important; }
    .chip-inactive { background:#fee2e2 !important; color:#b91c1c !important; }
    .chip-system   { background:#fef3c7 !important; color:#92400e !important; font-size:11px !important; min-height:20px !important; margin-left:8px !important; }
    code { background: rgba(124,58,237,.08); color:#5b21b6; padding:2px 8px; border-radius:4px; font-family: monospace; font-size:13px; }
  `]
})
export class TenantsComponent implements OnInit {
  private tenantService = inject(TenantService);
  private snack = inject(MatSnackBar);

  columns = ['id', 'code', 'name', 'clientName', 'cnpj', 'lastAccess', 'createdAt', 'status', 'actions'];
  items   = signal<TenantListItem[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.tenantService.getAll().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar tenants.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
