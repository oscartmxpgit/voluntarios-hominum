import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleLoaderService {

  load(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('#google-script');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject('Google script failed to load');

      document.head.appendChild(script);
    });
  }
}