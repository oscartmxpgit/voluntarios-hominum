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
    await this.clerkService.init();

    const container = this.signInContainer?.nativeElement;
    const clerk = this.clerkService.clerk;

    if (clerk && container) {
      clerk.mountSignIn(container, {
        appearance: {
          variables: {
            colorPrimary: '#4338ca', // Modern indigo branding
          }
        }
      });
    } else {
      console.error('Clerk or SignInContainer not found');
    }
  }
}