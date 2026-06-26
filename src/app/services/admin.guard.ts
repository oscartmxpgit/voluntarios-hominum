import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from './user.service';

export const adminGuard: CanActivateFn = async () => {
  const userService = inject(UserService);
  const router = inject(Router);

  try {
    const user = await userService.getCurrentUserProfile();

    if (!user) {
      return router.parseUrl('/login');
    }

    if (user.is_coordinator !== true) {
      return router.parseUrl('/');
    }

    return true;

  } catch (err) {
    console.error('AdminGuard error:', err);
    return router.parseUrl('/');
  }
};