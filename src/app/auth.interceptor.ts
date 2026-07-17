import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ClerkService } from './services/clerk.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clerkService = inject(ClerkService);
  const authService = inject(AuthService);

  return from(clerkService.getToken()).pipe(
    switchMap(token => {
      if (!token) {
        return next(req);
      }

      return next(req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      }));
    }),
    catchError((err: HttpErrorResponse) => {
      // Si el backend responde 403, actualizamos el estado globalmente
      if (err.status === 403) {
        authService.isForbidden.set(true);
      }
      return throwError(() => err);
    })
  );
};