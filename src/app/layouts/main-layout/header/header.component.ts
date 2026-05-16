import { Component, Output, EventEmitter, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    MatToolbarModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatDividerModule, TranslocoModule
  ],
  template: `
    <mat-toolbar class="app-toolbar">
      <button mat-icon-button (click)="toggleSidebar.emit()" aria-label="Toggle sidebar">
        <mat-icon>menu</mat-icon>
      </button>

      <span class="spacer"></span>

      <!-- Language selector -->
      <button mat-icon-button [matMenuTriggerFor]="langMenu"
              [title]="'language.label' | transloco" class="lang-btn">
        <mat-icon>language</mat-icon>
      </button>
      <mat-menu #langMenu="matMenu">
        @for (lang of langService.supported; track lang.code) {
          <button mat-menu-item (click)="setLang(lang.code)"
                  [class.active-lang]="lang.code === currentLang()">
            <span>{{ lang.labelKey | transloco }}</span>
            @if (lang.code === currentLang()) {
              <mat-icon class="check-icon">check</mat-icon>
            }
          </button>
        }
      </mat-menu>

      <!-- Avatar + user menu -->
      <button mat-button [matMenuTriggerFor]="userMenu" class="avatar-btn" aria-label="User menu">
        <span class="avatar-circle">{{ auth.initials() }}</span>
        <span class="display-name">{{ auth.displayName() }}</span>
        <mat-icon class="chevron">expand_more</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu" class="user-dropdown">
        <div class="menu-header" (click)="$event.stopPropagation()">
          <span class="avatar-circle avatar-lg">{{ auth.initials() }}</span>
          <div class="menu-user-info">
            <strong>{{ auth.displayName() }}</strong>
            <small>{{ auth.user()?.email }}</small>
            <span class="tenant-badge">{{ auth.user()?.tenant_code }}</span>
          </div>
        </div>
        <mat-divider />
        <button mat-menu-item routerLink="/profile">
          <mat-icon>manage_accounts</mat-icon>
          <span transloco="nav.profile">Meu Perfil</span>
        </button>
        <mat-divider />
        <button mat-menu-item (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          <span transloco="nav.logout">Sair</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    mat-toolbar {
      position: sticky; top: 0; z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      background: var(--color-primary, #7c3aed) !important;
      color: white !important;
    }
    mat-toolbar button { color: white; }
    .spacer { flex: 1; }
    .lang-btn { opacity: 0.85; }

    /* Avatar circle */
    .avatar-circle {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      color: white; font-size: 13px; font-weight: 700;
      flex-shrink: 0;
    }
    .avatar-lg { width: 42px; height: 42px; font-size: 16px; }
    .avatar-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 0 8px; height: 48px;
      .display-name { font-size: 14px; font-weight: 500; max-width: 140px;
                      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chevron { font-size: 18px; width: 18px; height: 18px; }
    }

    /* User dropdown header */
    .menu-header {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; min-width: 240px;
      pointer-events: none;
      .menu-user-info {
        display: flex; flex-direction: column; line-height: 1.3; overflow: hidden;
        strong { font-size: 14px; font-weight: 600; }
        small { font-size: 12px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; }
      }
    }
    .tenant-badge {
      display: inline-block; margin-top: 4px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
      background: var(--color-primary, #7c3aed); color: white;
      border-radius: 4px; padding: 1px 6px;
    }

    /* Active lang check */
    .active-lang { font-weight: 600; }
    .check-icon { font-size: 16px; width: 16px; height: 16px;
                  margin-left: auto; color: var(--color-primary, #7c3aed); }
  `]
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  auth = inject(AuthService);
  langService = inject(LanguageService);
  private transloco = inject(TranslocoService);

  currentLang() { return this.langService.getLanguage(); }

  setLang(code: string) {
    this.langService.setLanguage(code as any);
  }
}
