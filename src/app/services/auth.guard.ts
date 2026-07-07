// services/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. Esperamos a que el proceso de carga termine
  while (!auth.isReady()) {
    await new Promise(r => setTimeout(r, 50));
  }

  // 2. Si no hay sesión en Clerk, al login
  if (!auth.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  // 3. Validación CRÍTICA: Comprobamos si el usuario fue cargado desde la BD
  // Si auth.user() es null, significa que Clerk está logueado pero el backend 
  // devolvió 403 (Usuario no registrado).
  if (!auth.user()) {
    console.warn('Usuario no autorizado en base de datos');
    await auth.logout(); // Cerramos sesión de Clerk para limpiar el estado
    return router.parseUrl('/login');
  }

  return true;
};