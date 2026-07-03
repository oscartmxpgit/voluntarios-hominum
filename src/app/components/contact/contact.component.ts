import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private contactService = inject(ContactService);

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  async onSubmit() {
    if (this.contactForm.valid) {
      try {
        // Envío real al backend
        await this.contactService.sendContactForm(this.contactForm.value);
        
        this.snackBar.open('Mensaje enviado correctamente. Gracias por contactar.', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar']
        });
        
        this.contactForm.reset();
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        this.snackBar.open('Error al enviar el mensaje. Inténtalo de nuevo más tarde.', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
}