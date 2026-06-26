import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClerkService } from '../services/clerk.service';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private router = inject(Router);
  private clerkService = inject(ClerkService);

  user = signal<User | null>(null);

  constructor() {
    this.syncUserFromClerk();
  }

  private syncUserFromClerk(): void {
    const interval = setInterval(() => {
      const clerkUser = this.clerkService.clerk?.user;
      const session = this.clerkService.clerk?.session;

      if (session && clerkUser) {

        this.user.set({
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || '',
          picture: clerkUser.imageUrl || '',
          isCoordinator: false
        });

        clearInterval(interval);
      }
    }, 200);
  }

  getUserEmail(): string {
    return this.user()?.email || '';
  }

  isLoggedIn(): boolean {
    return !!this.clerkService.clerk?.session;
  }

  async getToken(): Promise<string | null> {
    return await this.clerkService.getToken();
  }

  logout(): void {
    this.clerkService.signOut().then(() => {
      this.user.set(null);
      this.router.navigate(['/login']);
    });
  }
}