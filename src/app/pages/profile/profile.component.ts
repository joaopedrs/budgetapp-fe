import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';

// Custom validator: at least 1 uppercase, 1 digit, 1 special char
function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!v) return null; // only validate when non-empty
  const ok = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(v);
  return ok ? null : { passwordStrength: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatChipsModule,
    TranslocoModule
  ],
  template: `
    <div class="page" *transloco="let t">
      <h2 class="page-title">{{ t('profile.title') }}</h2>

      <div class="profile-layout">

        <!-- ── Profile Info Card ─────────────────────── -->
        <mat-card class="profile-card">
          <mat-card-header>
            <div class="avatar-row">
              <span class="avatar-circle">{{ auth.initials() }}</span>
              <div>
                <h3>{{ profileForm.get('name')?.value || auth.displayName() }}</h3>
                <span class="tenant-badge">{{ auth.user()?.tenant_code }}</span>
                <mat-chip class="role-chip">
                  {{ auth.user()?.role === 'Admin' ? t('users.roles.Admin') : t('users.roles.User') }}
                </mat-chip>
              </div>
            </div>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('users.name') }}</mat-label>
                <mat-icon matPrefix>person</mat-icon>
                <input matInput formControlName="name" />
                @if (profileForm.get('name')?.hasError('required') && profileForm.get('name')?.touched) {
                  <mat-error>{{ t('users.name') }} {{ t('common.error').toLowerCase() }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('auth.email') }}</mat-label>
                <mat-icon matPrefix>email</mat-icon>
                <input matInput [value]="auth.user()?.email" readonly />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('users.phone') }}</mat-label>
                <mat-icon matPrefix>phone</mat-icon>
                <input matInput formControlName="phone" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('profile.tenantLabel') }}</mat-label>
                <mat-icon matPrefix>domain</mat-icon>
                <input matInput [value]="auth.user()?.tenant_code" readonly />
              </mat-form-field>

              <div class="form-actions">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="profileSaving() || profileForm.pristine">
                  @if (profileSaving()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <ng-container>
                      <mat-icon>save</mat-icon> {{ t('common.save') }}
                    </ng-container>
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- ── Change Password Card ──────────────────── -->
        <mat-card class="password-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="card-icon">lock_reset</mat-icon>
              {{ t('profile.changePassword') }}
            </mat-card-title>
          </mat-card-header>

          <mat-card-content>
            <p class="password-hint">{{ t('profile.passwordStrength') }}</p>

            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('profile.currentPassword') }}</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input matInput [type]="showCurrent() ? 'text' : 'password'"
                       formControlName="currentPassword" autocomplete="current-password" />
                <button mat-icon-button matSuffix type="button" (click)="showCurrent.set(!showCurrent())">
                  <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
                  <mat-error>{{ t('auth.errors.passwordRequired') }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('profile.newPassword') }}</mat-label>
                <mat-icon matPrefix>lock_open</mat-icon>
                <input matInput [type]="showNew() ? 'text' : 'password'"
                       formControlName="newPassword" autocomplete="new-password" />
                <button mat-icon-button matSuffix type="button" (click)="showNew.set(!showNew())">
                  <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                  <mat-error>{{ t('auth.errors.passwordRequired') }}</mat-error>
                }
                @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
                  <mat-error>{{ t('auth.errors.passwordMin') }}</mat-error>
                }
                @if (passwordForm.get('newPassword')?.hasError('passwordStrength') && passwordForm.get('newPassword')?.touched) {
                  <mat-error>{{ t('profile.passwordStrength') }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ t('profile.confirmPassword') }}</mat-label>
                <mat-icon matPrefix>lock_open</mat-icon>
                <input matInput [type]="showConfirm() ? 'text' : 'password'"
                       formControlName="confirmPassword" autocomplete="new-password" />
                <button mat-icon-button matSuffix type="button" (click)="showConfirm.set(!showConfirm())">
                  <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched) {
                  <mat-error>{{ t('profile.passwordMismatch') }}</mat-error>
                }
              </mat-form-field>

              <div class="form-actions">
                <button mat-flat-button color="accent" type="submit"
                        [disabled]="pwSaving() || passwordForm.invalid">
                  @if (pwSaving()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <ng-container>
                      <mat-icon>lock_reset</mat-icon> {{ t('profile.changePassword') }}
                    </ng-container>
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--color-primary, #1e1145); }
    .profile-layout { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
    .profile-card { flex: 1 1 360px; min-width: 320px; }
    .password-card { flex: 1 1 360px; min-width: 320px; }
    .full-width { width: 100%; margin-bottom: 4px; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 12px; gap: 8px; }

    /* Avatar */
    .avatar-row { display: flex; align-items: center; gap: 16px; padding: 16px 0 8px; }
    .avatar-circle {
      display: inline-flex; align-items: center; justify-content: center;
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--color-primary, #7c3aed); color: white;
      font-size: 20px; font-weight: 700; flex-shrink: 0;
    }
    .avatar-row h3 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
    .tenant-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      background: var(--color-primary, #7c3aed); color: white;
      border-radius: 4px; padding: 1px 6px; margin-right: 6px;
    }
    .role-chip { font-size: 11px !important; height: 22px !important; }

    /* Card title with icon */
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .card-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary, #7c3aed); }

    .password-hint {
      font-size: 12px; color: rgba(0,0,0,0.5);
      margin: 0 0 16px; line-height: 1.5;
    }
  `]
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private userService = inject(UserService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private transloco = inject(TranslocoService);

  profileSaving = signal(false);
  pwSaving = signal(false);
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(20)]]
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: matchPasswords }
  );

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (user: User) => {
        this.profileForm.patchValue({ name: user.name, phone: user.phone ?? '' });
      }
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.profileSaving.set(true);

    const { name, phone } = this.profileForm.value;
    this.userService.updateMe({ name: name!, phone: phone ?? null }).subscribe({
      next: () => {
        this.profileSaving.set(false);
        this.profileForm.markAsPristine();
        this.snack.open(this.transloco.translate('profile.profileUpdated'), 'OK', { duration: 3000 });
      },
      error: () => {
        this.profileSaving.set(false);
        this.snack.open(this.transloco.translate('common.error'), 'OK', { duration: 4000 });
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.pwSaving.set(true);

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.userService.changePassword({ currentPassword: currentPassword!, newPassword: newPassword! }).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.passwordForm.reset();
        this.snack.open(this.transloco.translate('profile.passwordChanged'), 'OK', { duration: 3000 });
      },
      error: () => {
        this.pwSaving.set(false);
        this.snack.open(this.transloco.translate('common.error'), 'OK', { duration: 4000 });
      }
    });
  }
}

function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  return np && cp && np !== cp ? { passwordMismatch: true } : null;
}
