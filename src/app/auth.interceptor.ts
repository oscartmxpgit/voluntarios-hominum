import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ClerkService } from './services/clerk.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clerkService = inject(ClerkService);

  return from(clerkService.getToken()).pipe(
    switchMap(token => {

      if (!token) {
        console.warn('NO TOKEN FROM CLERK');
        return next(req);
      }

      return next(req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      }));
    }),
    catchError(err => {
      console.error('Interceptor error:', err);
      return next(req); // ok fallback
    })
  );
};