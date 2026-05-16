import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="login-logo">
            <mat-icon class="logo-icon">account_balance_wallet</mat-icon>
            <h1>BudgetApp</h1>
            <p transloco="app.tagline">Gestão de orçamentos e workflows</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (sessionExpired()) {
            <div class="alert-banner">
              <mat-icon>info</mat-icon>
              <span transloco="auth.sessionExpired">Sua sessão expirou. Faça login novamente.</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label transloco="auth.tenantCode">Código do tenant</mat-label>
              <mat-icon matPrefix>domain</mat-icon>
              <input matInput formControlName="tenantCode" autocomplete="organization" />
              @if (form.get('tenantCode')?.hasError('required') && form.get('tenantCode')?.touched) {
                <mat-error transloco="auth.errors.tenantCodeRequired">Código do tenant é obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label transloco="auth.email">E-mail</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error transloco="auth.errors.emailRequired">E-mail é obrigatório</mat-error>
              }
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <mat-error transloco="auth.errors.emailInvalid">Informe um e-mail válido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label transloco="auth.password">Senha</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="showPassword() ? 'text' : 'password'"
                     formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button"
                      (click)="togglePassword()">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error transloco="auth.errors.passwordRequired">Senha é obrigatória</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit"
                    class="full-width login-btn" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                <span transloco="auth.loginButton">Entrar</span>
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      width: 100%;
      max-width: 420px;
      padding: 16px;
    }
    .login-card {
      border-radius: 16px !important;
      box-shadow: 0 24px 48px rgba(0,0,0,0.3) !important;
    }
    mat-card-header { display: block; padding: 0 !important; }
    .login-logo {
      text-align: center;
      padding: 32px 24px 8px;
      h1 { margin: 8px 0 4px; font-size: 26px; font-weight: 700; color: var(--color-primary, #7c3aed); }
      p { margin: 0; font-size: 13px; color: rgba(0,0,0,0.5); }
    }
    .logo-icon { font-size: 48px; width: 48px; height: 48px; color: var(--color-primary, #7c3aed); }
    mat-card-content { padding: 24px !important; }
    .full-width { width: 100%; }
    .login-btn { height: 48px; font-size: 16px; margin-top: 8px; background: var(--color-primary, #7c3aed) !important; }
    .alert-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #92400e;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    mat-form-field { margin-bottom: 4px; }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  loading = signal(false);
  showPassword = signal(false);
  sessionExpired = signal(false);

  form = this.fb.group({
    tenantCode: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    this.sessionExpired.set(this.route.snapshot.queryParamMap.get('expired') === '1');
  }

  togglePassword() { this.showPassword.set(!this.showPassword()); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const { tenantCode, email, password } = this.form.value;
    this.auth.login({ tenantCode: tenantCode!, email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.loading.set(false);
        this.snack.open('E-mail, senha ou código de tenant inválidos.', 'OK', {
          duration: 4000, panelClass: 'snack-error'
        });
      }
    });
  }
}
