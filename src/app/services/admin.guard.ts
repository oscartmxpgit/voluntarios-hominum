import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. Aseguramos que la sincronización haya terminado
  while (!auth.isReady()) {
    await new Promise(r => setTimeout(r, 50));
  }

  // 2. Si no hay usuario cargado en la señal, significa que 
  // o no está logueado en Clerk o no existe en nuestra BD (syncUser falló)
  if (!auth.user()) {
    return router.parseUrl('/login');
  }

  // 3. Verificación de rol
  if (!auth.isAdmin()) {
    console.warn('Intento de acceso a ruta de admin sin privilegios');
    return router.parseUrl('/');
  }

  return true;
};