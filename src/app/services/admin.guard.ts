import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

export const adminGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  const localUser = auth.user();

  // ❌ Not logged in at all
  if (!auth.isLoggedIn() || !localUser?.email) {
    return router.parseUrl('/login');
  }

  try {
    // 🔥 Always validate against backend (source of truth)
    const dbUser = await userService.getUserByEmail(localUser.email);

    // ❌ User no longer exists in DB
    if (!dbUser) {
      auth.logout();
      return router.parseUrl('/login');
    }

    // ❌ Not coordinator
    if (dbUser.is_coordinator !== 1) {
      return router.parseUrl('/');
    }

    // 🔄 Sync local state (keeps UI consistent)
    if (localUser.isCoordinator !== (dbUser.is_coordinator === 1)) {
      auth.user.set({
        ...localUser,
        isCoordinator: dbUser.is_coordinator === 1
      });
    }

    return true;

  } catch (err) {
    // If backend fails → safest option is deny access
    return router.parseUrl('/');
  }
};