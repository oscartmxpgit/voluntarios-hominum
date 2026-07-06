import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContactService } from '../../services/contact.service';
import { RecaptchaModule } from 'ng-recaptcha';
import { environment } from '../../../environments/environment'; // Ajusta la ruta según tu estructura

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, RecaptchaModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private contactService = inject(ContactService);
  
  // Usamos el entorno
  siteKey = environment.recaptcha.siteKey;

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    recaptcha: [null, Validators.required]
  });

  async onSubmit() {
    if (this.contactForm.valid) {
      try {
        await this.contactService.sendContactForm(this.contactForm.value);
        
        this.snackBar.open('Mensaje enviado correctamente.', 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        
        this.contactForm.reset();
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        this.snackBar.open('Error al enviar el mensaje.', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
}