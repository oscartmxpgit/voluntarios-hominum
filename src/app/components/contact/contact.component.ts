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

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    recaptcha: [null] // Inicialmente sin validador
  });

  ngAfterViewInit(): void {
    // Retraso para evitar el error writeValue
    setTimeout(() => {
      this.isCaptchaReady = true;
    }, 0);
  }

  // Se llama cuando el usuario resuelve el captcha
  onCaptchaResolved(token: string | null) {
    if (token) {
      this.contactForm.patchValue({ recaptcha: token });
      this.contactForm.get('recaptcha')?.setValidators([Validators.required]);
      this.contactForm.get('recaptcha')?.updateValueAndValidity();
    }
  }

  async onSubmit() {
    if (this.contactForm.valid) {
      try {
        await this.contactService.sendContactForm(this.contactForm.value);
        this.snackBar.open('Mensaje enviado correctamente.', 'Cerrar', { duration: 5000 });
        this.contactForm.reset();
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        this.snackBar.open('Error al enviar el mensaje.', 'Cerrar', { duration: 5000 });
      }
    }
  }
}