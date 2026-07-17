import { Component, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ContactService } from '../../services/contact.service';
import { RecaptchaModule } from 'ng-recaptcha';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, RecaptchaModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private contactService = inject(ContactService);
  
  siteKey = environment.recaptcha.siteKey;
  isCaptchaReady = false;
  
  // Guardamos el token manualmente, sin depender de FormControl
  captchaToken: string | null = null; 

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.isCaptchaReady = true;
    }, 0);
  }

  // Capturamos el token cuando el usuario completa el captcha
  onCaptchaResolved(token: string | null) {
    this.captchaToken = token;
  }

  async onSubmit() {
    // Validamos el formulario y comprobamos que el token exista
    if (this.contactForm.valid && this.captchaToken) {
      try {
        const payload = {
          ...this.contactForm.value,
          recaptcha: this.captchaToken
        };
        
        await this.contactService.sendContactForm(payload);
        
        this.snackBar.open('Mensaje enviado correctamente.', 'Cerrar', { duration: 5000 });
        this.contactForm.reset();
        this.captchaToken = null; // Reiniciar el token de seguridad
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        this.snackBar.open('Error al enviar el mensaje.', 'Cerrar', { duration: 5000 });
      }
    } else if (!this.captchaToken) {
      this.snackBar.open('Por favor, completa el captcha.', 'Cerrar', { duration: 3000 });
    }
  }
}