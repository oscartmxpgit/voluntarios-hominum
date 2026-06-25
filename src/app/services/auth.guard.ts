import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  // Verificación doble: estado de sesión y presencia de token
  if (auth.isLoggedIn()) {
    return true;
  }
  
  // Si algo falla, limpiamos y mandamos al login
  auth.logout();
  return router.parseUrl('/login');
};