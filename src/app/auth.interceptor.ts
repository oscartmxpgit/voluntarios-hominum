import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ClerkService } from './services/clerk.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const clerkService = inject(ClerkService);

  return from(clerkService.getToken()).pipe(
    switchMap(token => {

      if (!token) return next(req);

      return next(req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      }));
    })
  );
};