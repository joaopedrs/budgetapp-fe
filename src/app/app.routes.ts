import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public — login layout at explicit /login path
  {
    path: 'login',
    loadComponent: () => import('./layouts/login-layout/login-layout.component').then(m => m.LoginLayoutComponent),
    canActivate: [guestGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
      }
    ]
  },

  // Protected — main layout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Inbox + execução de instâncias
      {
        path: 'inbox',
        loadComponent: () => import('./pages/inbox/inbox.component').then(m => m.InboxComponent)
      },
      {
        path: 'finished',
        loadComponent: () => import('./pages/finished/finished.component').then(m => m.FinishedComponent)
      },
      {
        path: 'process-instances/:id',
        loadComponent: () => import('./pages/process-instances/execution.component').then(m => m.ExecutionComponent)
      },

      // Admin — Tenants (system tenant only; BE retorna 403 caso contrário)
      {
        path: 'admin/tenants',
        loadComponent: () => import('./pages/tenants/tenants.component').then(m => m.TenantsComponent)
      },
      {
        path: 'admin/tenants/new',
        loadComponent: () => import('./pages/tenants/tenant-form.component').then(m => m.TenantFormComponent)
      },
      {
        path: 'admin/tenants/:id',
        loadComponent: () => import('./pages/tenants/tenant-form.component').then(m => m.TenantFormComponent)
      },

      // Users
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'users/new',
        loadComponent: () => import('./pages/users/user-form.component').then(m => m.UserFormComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./pages/users/user-form.component').then(m => m.UserFormComponent)
      },

      // Processes
      {
        path: 'processes',
        loadComponent: () => import('./pages/processes/processes.component').then(m => m.ProcessesComponent)
      },
      {
        path: 'processes/new',
        loadComponent: () => import('./pages/processes/process-form.component').then(m => m.ProcessFormComponent)
      },
      {
        path: 'processes/:id',
        loadComponent: () => import('./pages/processes/process-form.component').then(m => m.ProcessFormComponent)
      },
      {
        path: 'processes/:id/form',
        loadComponent: () => import('./pages/processes/form-builder/form-builder.component').then(m => m.FormBuilderComponent)
      },
      {
        path: 'processes/:id/steps',
        loadComponent: () => import('./pages/processes/steps-config/steps-config.component').then(m => m.StepsConfigComponent)
      },

      // Roles (Papéis)
      {
        path: 'roles',
        loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent)
      },
      {
        path: 'roles/new',
        loadComponent: () => import('./pages/roles/role-form.component').then(m => m.RoleFormComponent)
      },
      {
        path: 'roles/:id',
        loadComponent: () => import('./pages/roles/role-form.component').then(m => m.RoleFormComponent)
      },

      // Companies
      {
        path: 'companies',
        loadComponent: () => import('./pages/companies/companies.component').then(m => m.CompaniesComponent)
      },
      {
        path: 'companies/new',
        loadComponent: () => import('./pages/companies/company-form.component').then(m => m.CompanyFormComponent)
      },
      {
        path: 'companies/:id',
        loadComponent: () => import('./pages/companies/company-form.component').then(m => m.CompanyFormComponent)
      },

      // Settings
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },

      // Logs & Profile
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent)
      },
      {
        path: 'logs/:id',
        loadComponent: () => import('./pages/logs/log-detail.component').then(m => m.LogDetailComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },

  { path: '**', redirectTo: '/login' }
];
