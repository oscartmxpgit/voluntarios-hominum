import { Component, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { ClerkService } from '../../services/clerk.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {

  @ViewChild('signInContainer', { static: true })
  signInContainer!: ElementRef<HTMLDivElement>;

  private clerkService = inject(ClerkService);

  async ngAfterViewInit(): Promise<void> {
    // 1. Ensure service is initialized
    await this.clerkService.init();

    // 2. Check that the element exists
    const container = this.signInContainer?.nativeElement;
    const clerk = this.clerkService.clerk;

    if (clerk && container) {
      // 3. Mount
      clerk.mountSignIn(container);
    } else {
      console.error('Clerk or SignInContainer not found', { clerk, container });
    }
  }
}