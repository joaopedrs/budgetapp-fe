import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, TranslocoModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Configurações</h2>
          <p class="page-subtitle">Personalize a aparência do sistema</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="40" /></div>
      } @else {
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Tema Visual</mat-card-title>
            <mat-card-subtitle>Defina as cores e o logotipo exibidos no sistema</mat-card-subtitle>
          </mat-card-header>
          <mat-divider />
          <mat-card-content style="margin-top:16px">
            <form [formGroup]="form" (ngSubmit)="onSave()">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Cor Primária</mat-label>
                  <input matInput formControlName="themePrimaryColor"
                    placeholder="#1e1145" maxlength="7" />
                  <mat-hint>Formato HEX, ex: #1e1145</mat-hint>
                  @if (primaryPreview()) {
                    <span matSuffix class="color-dot" [style.background]="primaryPreview()!"></span>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Cor Secundária</mat-label>
                  <input matInput formControlName="themeSecondaryColor"
                    placeholder="#7c3aed" maxlength="7" />
                  <mat-hint>Formato HEX, ex: #7c3aed</mat-hint>
                  @if (secondaryPreview()) {
                    <span matSuffix class="color-dot" [style.background]="secondaryPreview()!"></span>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-col">
                  <mat-label>URL do Logotipo</mat-label>
                  <input matInput formControlName="logoUrl"
                    placeholder="https://exemplo.com/logo.png" />
                  <mat-hint>Link público para a imagem PNG/SVG</mat-hint>
                </mat-form-field>

                @if (form.value.logoUrl) {
                  <div class="logo-preview full-col">
                    <p class="preview-label">Pré-visualização:</p>
                    <img [src]="form.value.logoUrl" alt="Logo" class="logo-img"
                      (error)="logoError = true" />
                  </div>
                }
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="loadSettings()">
                  <mat-icon>refresh</mat-icon> Restaurar
                </button>
                <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
                  @if (saving()) {
                    <ng-container><mat-spinner diameter="18" /></ng-container>
                  } @else {
                    <ng-container><mat-icon>save</mat-icon> Salvar</ng-container>
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .form-card { max-width: 720px; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-top: 8px;
    }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .full-col { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
    mat-form-field { width: 100%; }
    .color-dot {
      display: inline-block;
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.15);
      margin-right: 4px;
    }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
    .logo-preview { margin-top: 4px; }
    .preview-label { font-size: 12px; color: rgba(0,0,0,0.55); margin: 0 0 8px; }
    .logo-img { max-height: 80px; max-width: 200px; object-fit: contain; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px; }
  `]
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private themeService = inject(ThemeService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  logoError = false;

  form = this.fb.group({
    themePrimaryColor: [''],
    themeSecondaryColor: [''],
    logoUrl: ['']
  });

  get primaryPreview(): () => string | null {
    return () => {
      const v = this.form.value.themePrimaryColor;
      return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
    };
  }

  get secondaryPreview(): () => string | null {
    return () => {
      const v = this.form.value.themeSecondaryColor;
      return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
    };
  }

  ngOnInit() { this.loadSettings(); }

  loadSettings() {
    this.loading.set(true);
    this.settingsService.get().subscribe({
      next: s => {
        this.form.patchValue({
          themePrimaryColor: s.themePrimaryColor ?? '',
          themeSecondaryColor: s.themeSecondaryColor ?? '',
          logoUrl: s.logoUrl ?? ''
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSave() {
    this.saving.set(true);
    const { themePrimaryColor, themeSecondaryColor, logoUrl } = this.form.getRawValue();
    this.settingsService.update({
      themePrimaryColor: themePrimaryColor || null,
      themeSecondaryColor: themeSecondaryColor || null,
      logoUrl: logoUrl || null
    }).subscribe({
      next: () => {
        this.snack.open('Configurações salvas.', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.saving.set(false);
        // Reapply theme immediately
        this.themeService.loadAndApply().subscribe();
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('Erro ao salvar.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }
}
