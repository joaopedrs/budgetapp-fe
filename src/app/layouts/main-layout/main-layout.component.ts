import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent, MatSidenavModule],
  template: `
    <div class="main-layout">
      <!-- Sidebar -->
      <aside class="sidebar-wrapper" [class.collapsed]="sidebarCollapsed()">
        <app-sidebar [collapsed]="sidebarCollapsed()" (itemClicked)="onMobileItemClick()" />
      </aside>

      <!-- Main area -->
      <div class="content-wrapper">
        <app-header (toggleSidebar)="toggleSidebar()" />

        <main class="page-content">
          <router-outlet />
        </main>

        <app-footer />
      </div>
    </div>
  `,
  styles: [`
    .main-layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar-wrapper {
      width: var(--sidebar-width);
      flex-shrink: 0;
      transition: width 0.25s ease;
    }
    .sidebar-wrapper.collapsed { width: 64px; }

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: #f8f7ff;
    }
    .page-content {
      flex: 1;
      padding: 24px;
    }

    @media (max-width: 768px) {
      .sidebar-wrapper { position: fixed; z-index: 200; height: 100vh; }
      .sidebar-wrapper.collapsed { width: 0; overflow: hidden; }
      .content-wrapper { margin-left: 0 !important; }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);
  private theme = inject(ThemeService);

  constructor(private breakpoint: BreakpointObserver) {
    this.breakpoint.observe([Breakpoints.Handset]).subscribe(r => {
      this.sidebarCollapsed.set(r.matches);
    });
  }

  ngOnInit() {
    // Load tenant theme after entering the protected layout
    this.theme.loadAndApply().subscribe();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  onMobileItemClick() {
    if (this.breakpoint.isMatched(Breakpoints.Handset)) {
      this.sidebarCollapsed.set(true);
    }
  }
}
