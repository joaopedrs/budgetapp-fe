import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslocoModule } from '@jsverse/transloco';
import { SettingsService } from '../../core/services/settings.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Página de configurações com seções condicionais:
 *  - **Sempre**: tema visual (cores + logo)
 *  - **Tenant geral (Admin)**: template de notificação de chegada
 *  - **System tenant (Admin)**: configuração SMTP + teste de envio
 *
 * O endpoint `/tenants/system/smtp` retorna 403 fora do system tenant, então
 * mesmo se a seção aparecesse por engano no FE, o BE protege.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TranslocoModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatCardModule, MatCheckboxModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDividerModule, MatDialogModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Configurações</h2>
          <p class="page-subtitle">
            @if (isSystem()) { Administração da plataforma (system tenant) }
            @else            { Personalize a aparência e notificações do seu tenant }
          </p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="40" /></div>
      } @else {
        <!-- TEMA -->
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>Tema Visual</mat-card-title>
            <mat-card-subtitle>Cores e logotipo exibidos no sistema</mat-card-subtitle>
          </mat-card-header>
          <mat-divider />
          <mat-card-content style="margin-top:16px">
            <form [formGroup]="themeForm" (ngSubmit)="onSaveTheme()">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Cor Primária</mat-label>
                  <input matInput formControlName="themePrimaryColor" placeholder="#1e1145" maxlength="7" />
                  @if (primaryPreview()) {
                    <span matSuffix class="color-dot" [style.background]="primaryPreview()!"></span>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Cor Secundária</mat-label>
                  <input matInput formControlName="themeSecondaryColor" placeholder="#7c3aed" maxlength="7" />
                  @if (secondaryPreview()) {
                    <span matSuffix class="color-dot" [style.background]="secondaryPreview()!"></span>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-col">
                  <mat-label>URL do Logotipo</mat-label>
                  <input matInput formControlName="logoUrl" placeholder="https://exemplo.com/logo.png" />
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="savingTheme()">
                  @if (savingTheme()) { <mat-spinner diameter="18" /> }
                  @else { <ng-container><mat-icon>save</mat-icon> Salvar Tema</ng-container> }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- NOTIFICAÇÃO DE CHEGADA (tenant geral) -->
        @if (!isSystem()) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>Notificação de chegada</mat-card-title>
              <mat-card-subtitle>
                Texto enviado por e-mail aos executores quando uma etapa configurada
                como "Notificar chegada" recebe uma nova atividade.
              </mat-card-subtitle>
            </mat-card-header>
            <mat-divider />
            <mat-card-content style="margin-top:16px">
              <form [formGroup]="notifyForm" (ngSubmit)="onSaveNotification()">
                <p class="placeholder-hint">
                  Coringas (clique para inserir):
                  @for (ph of placeholders; track ph.key) {
                    <code class="ph-chip" (click)="insertPlaceholder(ph.key)">{{ '{' }}{{ ph.key }}{{ '}' }}</code>
                  }
                  <br />
                  Use também <code>{{ '{' }}id_do_campo{{ '}' }}</code> para inserir o valor de qualquer campo do formulário.
                </p>
                <mat-form-field appearance="outline" class="full-col">
                  <mat-label>Template do e-mail</mat-label>
                  <textarea matInput formControlName="arrivalNotificationTemplate"
                            rows="6" #notifyTemplate maxlength="10000"
                            placeholder="Olá, uma nova atividade de {atividade} foi alocada para {executor}"></textarea>
                  <mat-hint align="end">{{ notifyTemplate.value.length }}/10000</mat-hint>
                </mat-form-field>
                <div class="form-actions">
                  <button mat-flat-button color="primary" type="submit" [disabled]="savingNotification()">
                    @if (savingNotification()) { <mat-spinner diameter="18" /> }
                    @else { <ng-container><mat-icon>save</mat-icon> Salvar Notificação</ng-container> }
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        }

        <!-- SMTP (system tenant) -->
        @if (isSystem()) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>Servidor de E-mail (SMTP)</mat-card-title>
              <mat-card-subtitle>
                Configuração usada por toda a plataforma para enviar e-mails.
              </mat-card-subtitle>
            </mat-card-header>
            <mat-divider />
            <mat-card-content style="margin-top:16px">
              <form [formGroup]="smtpForm" (ngSubmit)="onSaveSmtp()">
                <div class="form-grid">
                  <mat-form-field appearance="outline" class="full-col">
                    <mat-label>Servidor SMTP</mat-label>
                    <input matInput formControlName="server" placeholder="smtp.gmail.com" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Porta</mat-label>
                    <input matInput type="number" formControlName="port" placeholder="587" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>E-mail (autenticação)</mat-label>
                    <input matInput type="email" formControlName="email" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-col">
                    <mat-label>Senha {{ smtpHasPassword() ? '(deixe em branco para manter a atual)' : '' }}</mat-label>
                    <input matInput type="password" formControlName="password" autocomplete="new-password" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-col">
                    <mat-label>Nome do remetente (opcional)</mat-label>
                    <input matInput formControlName="fromName" placeholder="BudgetApp" />
                  </mat-form-field>
                  <mat-checkbox formControlName="useSsl" class="full-col">
                    Usar SSL/TLS (recomendado para portas 465/587)
                  </mat-checkbox>
                </div>
                <div class="form-actions">
                  <button mat-stroked-button type="button"
                          (click)="openTestDialog()" [disabled]="savingSmtp() || smtpForm.invalid">
                    <mat-icon>send</mat-icon> Testar envio
                  </button>
                  <button mat-flat-button color="primary" type="submit" [disabled]="savingSmtp() || smtpForm.invalid">
                    @if (savingSmtp()) { <mat-spinner diameter="18" /> }
                    @else { <ng-container><mat-icon>save</mat-icon> Salvar SMTP</ng-container> }
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .form-card { max-width: 720px; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 8px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .full-col { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
    mat-form-field { width: 100%; }
    .color-dot {
      display: inline-block; width: 20px; height: 20px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.15); margin-right: 4px;
    }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
    .placeholder-hint { color: rgba(0,0,0,.6); font-size: 13px; margin: 0 0 12px; line-height: 1.6; }
    .ph-chip {
      cursor: pointer; background: #ede9fe; color: #5b21b6;
      padding: 1px 8px; border-radius: 4px; font-family: monospace; margin: 0 4px;
      transition: background .15s;
    }
    .ph-chip:hover { background: #ddd6fe; }
  `]
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private themeService = inject(ThemeService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  isSystem = this.auth.isSystemTenant;

  loading            = signal(true);
  savingTheme        = signal(false);
  savingNotification = signal(false);
  savingSmtp         = signal(false);
  smtpHasPassword    = signal(false);

  placeholders = [
    { key: 'atividade', desc: 'Nome/número da etapa' },
    { key: 'codigo',    desc: 'Código do fluxo' },
    { key: 'executor',  desc: 'Nome do executor' },
    { key: 'processo',  desc: 'Nome do processo' }
  ];

  themeForm = this.fb.group({
    themePrimaryColor: [''],
    themeSecondaryColor: [''],
    logoUrl: ['']
  });

  notifyForm = this.fb.group({
    arrivalNotificationTemplate: ['']
  });

  smtpForm = this.fb.group({
    server:   new FormControl<string>('',  { nonNullable: true, validators: [Validators.required, Validators.maxLength(256)] }),
    port:     new FormControl<number | null>(587, [Validators.required, Validators.min(1), Validators.max(65535)]),
    email:    new FormControl<string>('',  { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
    password: new FormControl<string>('',  { nonNullable: true }),
    useSsl:   new FormControl<boolean>(true, { nonNullable: true }),
    fromName: new FormControl<string>('',  { nonNullable: true })
  });

  primaryPreview = () => {
    const v = this.themeForm.value.themePrimaryColor;
    return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  };
  secondaryPreview = () => {
    const v = this.themeForm.value.themeSecondaryColor;
    return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  };

  ngOnInit() { this.loadAll(); }

  private loadAll() {
    this.loading.set(true);
    this.settingsService.get().subscribe({
      next: s => {
        this.themeForm.patchValue({
          themePrimaryColor: s.themePrimaryColor ?? '',
          themeSecondaryColor: s.themeSecondaryColor ?? '',
          logoUrl: s.logoUrl ?? ''
        });
        this.notifyForm.patchValue({
          arrivalNotificationTemplate: s.arrivalNotificationTemplate ?? ''
        });
        if (this.isSystem()) this.loadSmtp();
        else this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadSmtp() {
    this.settingsService.getSystemSmtp().subscribe({
      next: s => {
        this.smtpForm.patchValue({
          server: s.server ?? '',
          port: s.port ?? 587,
          email: s.email ?? '',
          password: '',
          useSsl: s.useSsl,
          fromName: s.fromName ?? ''
        });
        this.smtpHasPassword.set(s.hasPassword);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSaveTheme() {
    this.savingTheme.set(true);
    const v = this.themeForm.getRawValue();
    this.settingsService.update({
      themePrimaryColor: v.themePrimaryColor || null,
      themeSecondaryColor: v.themeSecondaryColor || null,
      logoUrl: v.logoUrl || null,
      arrivalNotificationTemplate: this.notifyForm.value.arrivalNotificationTemplate ?? null
    }).subscribe({
      next: () => {
        this.savingTheme.set(false);
        this.snack.open('Tema salvo.', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.themeService.loadAndApply().subscribe();
      },
      error: () => {
        this.savingTheme.set(false);
        this.snack.open('Erro ao salvar tema.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  onSaveNotification() {
    this.savingNotification.set(true);
    const themeV = this.themeForm.getRawValue();
    this.settingsService.update({
      themePrimaryColor: themeV.themePrimaryColor || null,
      themeSecondaryColor: themeV.themeSecondaryColor || null,
      logoUrl: themeV.logoUrl || null,
      arrivalNotificationTemplate: this.notifyForm.value.arrivalNotificationTemplate || null
    }).subscribe({
      next: () => {
        this.savingNotification.set(false);
        this.snack.open('Template de notificação salvo.', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: () => {
        this.savingNotification.set(false);
        this.snack.open('Erro ao salvar template.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  insertPlaceholder(key: string) {
    const ctrl = this.notifyForm.get('arrivalNotificationTemplate')!;
    const current = (ctrl.value ?? '') as string;
    const snippet = `{${key}}`;
    ctrl.setValue(current ? `${current} ${snippet}` : snippet);
    ctrl.markAsDirty();
  }

  onSaveSmtp() {
    if (this.smtpForm.invalid) { this.smtpForm.markAllAsTouched(); return; }
    this.savingSmtp.set(true);
    const v = this.smtpForm.getRawValue();
    this.settingsService.updateSystemSmtp({
      server: v.server,
      port: v.port!,
      email: v.email,
      password: v.password || null,
      useSsl: v.useSsl,
      fromName: v.fromName || null
    }).subscribe({
      next: s => {
        this.savingSmtp.set(false);
        this.smtpForm.patchValue({ password: '' });
        this.smtpHasPassword.set(s.hasPassword);
        this.snack.open('SMTP salvo.', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: err => {
        this.savingSmtp.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? 'Erro ao salvar SMTP.';
        this.snack.open(msg, 'OK', { duration: 5000, panelClass: 'snack-error' });
      }
    });
  }

  openTestDialog() {
    if (this.smtpForm.invalid) { this.smtpForm.markAllAsTouched(); return; }
    const ref = this.dialog.open(SmtpTestDialogComponent, {
      data: { defaultTo: this.smtpForm.value.email }
    });
    ref.afterClosed().subscribe((to: string | undefined) => {
      if (!to) return;
      const v = this.smtpForm.getRawValue();
      this.settingsService.testSystemSmtp({
        to,
        smtp: {
          server: v.server, port: v.port!, email: v.email,
          password: v.password || null,
          useSsl: v.useSsl,
          fromName: v.fromName || null
        }
      }).subscribe({
        next: () => this.snack.open('E-mail de teste enviado.', 'OK', { duration: 4000, panelClass: 'snack-success' }),
        error: err => {
          const msg = err?.error?.error ?? err?.error?.message ?? 'Falha no teste de SMTP.';
          this.snack.open(msg, 'OK', { duration: 6000, panelClass: 'snack-error' });
        }
      });
    });
  }
}

/** Modal — pergunta o e-mail destino para o teste SMTP. */
@Component({
  selector: 'app-smtp-test-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title><mat-icon>send</mat-icon> Testar envio de SMTP</h2>
    <mat-dialog-content>
      <p>Informe um e-mail para receber a mensagem de teste:</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>E-mail destinatário</mat-label>
        <input matInput type="email" [formControl]="emailCtrl" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="emailCtrl.invalid"
              (click)="dialogRef.close(emailCtrl.value)">
        Enviar teste
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; min-width: 320px; }`]
})
export class SmtpTestDialogComponent {
  dialogRef = inject(MatDialogRef<SmtpTestDialogComponent>);
  data = inject<{ defaultTo: string | null | undefined }>(MAT_DIALOG_DATA);
  emailCtrl = new FormControl<string>(this.data.defaultTo ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.email]
  });
}
