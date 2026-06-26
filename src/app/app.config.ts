import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { ClerkService } from './services/clerk.service';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),

    provideAppInitializer(() => {
      const clerkService = inject(ClerkService);
      return clerkService.init();
    })
  ]
};