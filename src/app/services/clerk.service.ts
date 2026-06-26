import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClerkService {
  // Use 'any' here to bypass local npm import compilation issues
  private _clerk: any = null;

  async init(): Promise<void> {
    // If already initialized locally or globally, don't re-run
    if (this._clerk || (window as any).Clerk?.loaded) {
      this._clerk = (window as any).Clerk;
      return;
    }

    try {
      const pubKey = environment.clerkPublishableKey;
      if (!pubKey) {
        throw new Error('Clerk Publishable Key is missing from environment.');
      }

      // Parse the Frontend API domain from your publishable key
      const parts = pubKey.split('_');
      if (parts.length < 3) {
        throw new Error('Invalid Clerk Publishable Key format.');
      }
      const clerkDomain = atob(parts[2]).slice(0, -1);

      // Inject Clerk's complete bundle script directly to bypass bundler limitations
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Clerk) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.setAttribute('data-clerk-publishable-key', pubKey);
        script.async = true;
        script.src = `https://${clerkDomain}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', (err) => reject(err));
        document.head.appendChild(script);
      });

      // Retrieve the global instance instantiated by the browser script
      const globalClerk = (window as any).Clerk;
      if (!globalClerk) {
        throw new Error('Clerk script loaded successfully, but window.Clerk is undefined.');
      }

      // Initialize and load the UI bundle natively
      if (!globalClerk.loaded) {
        await globalClerk.load();
      }

      this._clerk = globalClerk;
    } catch (err) {
      console.error('Clerk failed to load with UI components:', err);
    }
  }

  get clerk(): any {
    return this._clerk;
  }

  get user() {
    return this._clerk?.user;
  }

  get session() {
    return this._clerk?.session;
  }

  async getToken(): Promise<string | null> {
    try {
      return this._clerk?.session
        ? await this._clerk.session.getToken()
        : null;
    } catch (e) {
      console.error('Error obtaining Clerk token:', e);
      return null;
    }
  }

  async signOut(): Promise<void> {
    await this._clerk?.signOut();
  }
}