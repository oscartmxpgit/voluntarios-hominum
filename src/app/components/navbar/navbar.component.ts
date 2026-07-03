import { Component, HostListener, inject } from '@angular/core';
import { Router, NavigationStart, RouterModule } from '@angular/router'; // Added RouterModule
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true, // Ensure this is true
  templateUrl: './navbar.component.html',
  imports: [CommonModule, RouterModule], // Added RouterModule here
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  authService = inject(AuthService);
  router = inject(Router);

  isMenuOpen = false;
  isUserMenuOpen = false;

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.closeAllMenus();
      }
    });
  }

  toggleMenu(event?: Event): void {
    event?.stopPropagation(); // Prevent document click
    this.isMenuOpen = !this.isMenuOpen;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation(); // Prevent document click
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isMenuOpen = false;
  }

  closeAllMenus(): void {
    this.isMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Check if clicked inside active menus
    const clickedInsideUserMenu = target.closest('.user-dropdown');
    const clickedInsideDrawer = target.closest('.drawer') || target.closest('.menu-toggle');

    if (!clickedInsideUserMenu) {
      this.isUserMenuOpen = false;
    }

    if (!clickedInsideDrawer) {
      this.isMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllMenus();
  }
}