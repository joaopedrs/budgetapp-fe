import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  labelKey: string;
  icon: string;
  route: string;
  adminOnly?: boolean;       // role Admin
  systemTenantOnly?: boolean; // system tenant (budgetapp)
  dividerBefore?: boolean;
}

const ALL_ITEMS: MenuItem[] = [
  { labelKey: 'nav.dashboard',  icon: 'dashboard',      route: '/dashboard' },

  // General tenant items (all authenticated users)
  { labelKey: 'nav.users',      icon: 'people',         route: '/users', adminOnly: true },
  { labelKey: 'nav.processes',  icon: 'account_tree',   route: '/processes', adminOnly: true },
  { labelKey: 'nav.companies',  icon: 'business',       route: '/companies', adminOnly: true },
  { labelKey: 'nav.settings',   icon: 'tune',           route: '/settings', adminOnly: true },
  { labelKey: 'nav.logs',       icon: 'receipt_long',   route: '/logs', adminOnly: true },
  { labelKey: 'nav.profile',    icon: 'person',         route: '/profile' },

  // System-tenant-only admin items
  { labelKey: 'nav.tenants',    icon: 'domain',         route: '/admin/tenants',
    adminOnly: true, systemTenantOnly: true, dividerBefore: true },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatDividerModule, TranslocoModule],
  template: `
    <div class="sidebar" [class.collapsed]="collapsed" *transloco="let t">
      <div class="sidebar-brand">
        <mat-icon class="brand-icon">account_balance_wallet</mat-icon>
        @if (!collapsed) {
          <span class="brand-name">BudgetApp</span>
        }
      </div>

      <mat-divider />

      <mat-nav-list>
        @for (item of visibleItems(); track item.route) {
          @if (item.dividerBefore) {
            <mat-divider class="section-divider" />
          }
          <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link"
             [title]="collapsed ? t(item.labelKey) : ''"
             (click)="itemClicked.emit()">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            @if (!collapsed) {
              <span matListItemTitle>{{ t(item.labelKey) }}</span>
            }
          </a>
        }
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      background: #1e1145;
      color: #fff;
      display: flex;
      flex-direction: column;
      transition: width 0.25s ease;
      overflow: hidden;
    }
    .sidebar.collapsed { width: 64px; }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      background: rgba(255,255,255,0.05);
    }
    .brand-icon { color: #c084fc; font-size: 28px; width: 28px; height: 28px; }
    .brand-name { font-size: 18px; font-weight: 700; color: #fff; white-space: nowrap; }

    mat-nav-list { padding-top: 8px; }
    .section-divider { margin: 8px 12px; background: rgba(255,255,255,0.1); }

    a[mat-list-item] {
      color: rgba(255,255,255,0.75) !important;
      border-radius: 8px;
      margin: 2px 8px;
      transition: background 0.2s;
    }
    a[mat-list-item]:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
    a[mat-list-item].active-link {
      background: var(--color-primary, #7c3aed) !important;
      color: #fff !important;
    }
    mat-icon[matListItemIcon] { color: inherit !important; }
  `]
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() itemClicked = new EventEmitter<void>();

  private auth = inject(AuthService);

  visibleItems = computed(() => {
    const isAdmin = this.auth.isAdmin();
    const isSys = this.auth.isSystemTenant();
    return ALL_ITEMS.filter(i => {
      if (i.systemTenantOnly && !isSys) return false;
      if (i.adminOnly && !isAdmin) return false;
      return true;
    });
  });
}
