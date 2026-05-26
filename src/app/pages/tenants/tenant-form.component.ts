import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoModule } from '@jsverse/transloco';
import { TenantService } from '../../core/services/tenant.service';

/**
 * Criação/edição de um tenant.
 *
 * **Campos bloqueados na edição** (read-only via Validators-less control):
 *  - Id, CNPJ, Tenant Administrador (IsSystemTenant), Último acesso, Criado em, Atualizado em
 *  - CNPJ na CRIAÇÃO é editável (única vez); na edição vira read-only para
 *    preservar a identidade legal do cliente.
 *
 * Strings vazias viram null no payload — backend trata Phone/ClientName como null.
 */
@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, DatePipe, TranslocoModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEdit() ? t('tenants.edit') : t('tenants.new') }}</h2>
          <p class="page-subtitle">{{ t('tenants.subtitle') }}</p>
        </div>
        <a mat-stroked-button routerLink="/admin/tenants">
          <mat-icon>arrow_back</mat-icon> {{ t('common.back') }}
        </a>
      </div>

      @if (loading()) {
        <mat-card><div class="loading"><mat-spinner diameter="40" /></div></mat-card>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-card class="form-card">
            <mat-card-content style="padding-top:8px">
              <div class="grid">
                @if (isEdit()) {
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('tenants.id') }}</mat-label>
                    <input matInput [value]="tenantId()" disabled />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('tenants.cnpj') }}</mat-label>
                    <input matInput formControlName="cnpj" />
                    <mat-hint>{{ t('tenants.cnpjImmutable') }}</mat-hint>
                  </mat-form-field>
                }

                <mat-form-field appearance="outline">
                  <mat-label>{{ t('tenants.code') }}</mat-label>
                  <input matInput formControlName="code" maxlength="50" />
                  @if (form.get('code')?.hasError('required') && form.get('code')?.touched) {
                    <mat-error>{{ t('tenants.errors.codeRequired') }}</mat-error>
                  }
                  @if (form.get('code')?.hasError('minlength') && form.get('code')?.touched) {
                    <mat-error>{{ t('tenants.errors.codeMin') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ t('tenants.name') }}</mat-label>
                  <input matInput formControlName="name" maxlength="200" />
                  @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                    <mat-error>{{ t('tenants.errors.nameRequired') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ t('tenants.email') }}</mat-label>
                  <input matInput type="email" formControlName="email" maxlength="256" />
                  @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                    <mat-error>{{ t('tenants.errors.emailRequired') }}</mat-error>
                  }
                  @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                    <mat-error>{{ t('tenants.errors.emailInvalid') }}</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ t('tenants.phone') }}</mat-label>
                  <input matInput formControlName="phone" maxlength="40" />
                </mat-form-field>

                @if (!isEdit()) {
                  <mat-form-field appearance="outline">
                    <mat-label>{{ t('tenants.cnpj') }}</mat-label>
                    <input matInput formControlName="cnpj" maxlength="20" />
                    <mat-hint>{{ t('tenants.cnpjOnceOnly') }}</mat-hint>
                  </mat-form-field>
                }

                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ t('tenants.clientName') }}</mat-label>
                  <input matInput formControlName="clientName" maxlength="200" />
                </mat-form-field>
              </div>

              @if (isEdit()) {
                <div class="meta-row">
                  <div>
                    <small>{{ t('tenants.systemTenant') }}</small>
                    <div>
                      @if (detail()?.isSystemTenant) {
                        <mat-chip class="chip-system">{{ t('tenants.system') }}</mat-chip>
                      } @else {
                        <mat-chip>{{ t('tenants.regular') }}</mat-chip>
                      }
                    </div>
                  </div>
                  <div>
                    <small>{{ t('tenants.lastAccess') }}</small>
                    <div>{{ detail()?.lastAccessAt ? (detail()!.lastAccessAt | date:'short') : '—' }}</div>
                  </div>
                  <div>
                    <small>{{ t('tenants.createdAt') }}</small>
                    <div>{{ detail()?.createdAt | date:'short' }}</div>
                  </div>
                  <div>
                    <small>{{ t('tenants.updatedAt') }}</small>
                    <div>{{ detail()?.updatedAt | date:'short' }}</div>
                  </div>
                </div>

                <div class="active-row">
                  <mat-slide-toggle formControlName="isActive" color="primary">
                    {{ form.value.isActive ? t('common.active') : t('common.inactive') }}
                  </mat-slide-toggle>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <div class="form-actions">
            <a mat-stroked-button routerLink="/admin/tenants">{{ t('common.cancel') }}</a>
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="saving() || form.invalid">
              @if (saving()) { <mat-spinner diameter="20" /> }
              @else { <ng-container><mat-icon>save</mat-icon> {{ t('common.save') }}</ng-container> }
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
    .form-card { padding:8px; max-width:880px; }
    .loading { display:flex; justify-content:center; padding:40px; }
    .grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;
    }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .full { grid-column: 1 / -1; }
    mat-form-field { width: 100%; }
    .meta-row {
      display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap:12px; padding:16px; margin-top:8px; background:#faf9ff; border-radius:8px;
    }
    .meta-row small { color: rgba(0,0,0,.55); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    .active-row { padding: 12px 4px 4px; }
    .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:16px; }
    .chip-system { background:#fef3c7 !important; color:#92400e !important; font-size:11px !important; min-height:22px !important; }
  `]
})
export class TenantFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private tenantService = inject(TenantService);

  tenantId = signal<number | null>(null);
  isEdit = computed(() => this.tenantId() !== null);
  detail = signal<import('../../core/models/tenant.model').TenantDetail | null>(null);

  loading = signal(false);
  saving = signal(false);

  form = this.fb.group({
    // CNPJ desabilitado em edição (set em loadEdit), editável em criação.
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    phone: ['', [Validators.maxLength(40)]],
    cnpj: ['', [Validators.maxLength(20)]],
    clientName: ['', [Validators.maxLength(200)]],
    isActive: [true]
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.tenantId.set(+idParam);
      this.loadEdit();
    }
  }

  private loadEdit() {
    this.loading.set(true);
    this.tenantService.getById(this.tenantId()!).subscribe({
      next: t => {
        this.detail.set(t);
        this.form.patchValue({
          code: t.code,
          name: t.name,
          email: t.email,
          phone: t.phone ?? '',
          cnpj: t.cnpj ?? '',
          clientName: t.clientName ?? '',
          isActive: t.isActive
        });
        // CNPJ é IMUTÁVEL após criação — disable do FormControl mesmo (não só readonly visual).
        this.form.get('cnpj')!.disable();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar tenant.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.router.navigate(['/admin/tenants']);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const v = this.form.getRawValue();
    const obs = this.isEdit()
      ? this.tenantService.update(this.tenantId()!, {
          code: v.code!,
          name: v.name!,
          email: v.email!,
          phone: v.phone || null,
          clientName: v.clientName || null,
          isActive: v.isActive!
        })
      : this.tenantService.create({
          code: v.code!,
          name: v.name!,
          email: v.email!,
          phone: v.phone || null,
          cnpj: v.cnpj || null,
          clientName: v.clientName || null
        });

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(
          this.isEdit() ? 'Tenant atualizado.' : 'Tenant criado.',
          'OK', { duration: 3000, panelClass: 'snack-success' }
        );
        this.router.navigate(['/admin/tenants']);
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? 'Erro ao salvar tenant.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }
}
