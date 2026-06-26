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

    const clerk = this.clerkService.clerk;

    if (!clerk) return;

    clerk.mountSignIn(this.signInContainer.nativeElement);
  }
}