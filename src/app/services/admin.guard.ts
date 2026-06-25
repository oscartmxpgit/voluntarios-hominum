import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Verificamos si está logueado Y si es coordinador
  if (auth.isLoggedIn() && auth.user()?.isCoordinator) {
    return true;
  }

  // Si no es coordinador, lo sacamos al home (o donde prefieras)
  return router.parseUrl('/');
};