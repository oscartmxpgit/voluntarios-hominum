import { ApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeGoogleAuth } from './app.initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Simplemente pasamos la referencia a la función
    provideAppInitializer(() => initializeGoogleAuth())
  ]
};