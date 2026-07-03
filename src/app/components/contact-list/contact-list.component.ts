import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService, ContactSubmission } from '../../services/contact.service';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.css']
})
export class ContactListComponent implements OnInit {
  private contactService = inject(ContactService);
  submissions: ContactSubmission[] = [];
  loading = true;

  async ngOnInit() {
    await this.loadSubmissions();
  }

  async loadSubmissions() {
    try {
      this.loading = true;
      this.submissions = await this.contactService.getSubmissions();
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
    } finally {
      this.loading = false;
    }
  }

  async updateStatus(id: number, status: 'contacted' | 'archived') {
    try {
      await this.contactService.updateStatus(id, status);
      await this.loadSubmissions();
    } catch (error) {
      console.error('Error al actualizar:', error);
    }
  }
}