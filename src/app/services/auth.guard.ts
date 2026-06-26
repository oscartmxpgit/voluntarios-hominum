import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isReady()) {
    return router.parseUrl('/login');
  }

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.parseUrl('/login');
};