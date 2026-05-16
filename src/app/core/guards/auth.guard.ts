import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isTokenExpired()) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { expired: 1 } });
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree(['/dashboard']);
};

/** Allows access only to users with role Admin. Redirects to /dashboard otherwise. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/dashboard']);
};

/** Allows access only to the system tenant (budgetapp). Redirects to /dashboard otherwise. */
export const systemTenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  if (auth.isSystemTenant()) return true;
  return router.createUrlTree(['/dashboard']);
};
