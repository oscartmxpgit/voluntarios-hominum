import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneralEventsService, GeneralEvent } from '../../services/general-events.service';

@Component({
  selector: 'app-general-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-events.component.html',
  styleUrls: ['./general-events.component.css']
})
export class GeneralEventsComponent implements OnInit {
  private service = inject(GeneralEventsService);
  events: GeneralEvent[] = [];
  showForm = false;
  isEditing = false;
  
  // Inicialización con los nuevos campos
  currentEvent: GeneralEvent = { title: '', start_datetime: '', end_datetime: '' };

  async ngOnInit() { await this.refresh(); }

  async refresh() { this.events = await this.service.getAll(); }

  openCreateModal() {
    this.isEditing = false;
    this.currentEvent = { title: '', start_datetime: '', end_datetime: '' };
    this.showForm = true;
  }

  openEditModal(ev: GeneralEvent) {
    this.isEditing = true;
    // Creamos una copia para no mutar el objeto original mientras editamos
    this.currentEvent = { ...ev };
    this.showForm = true;
  }

  async saveEvent() {
    if (this.isEditing) await this.service.update(this.currentEvent);
    else await this.service.create(this.currentEvent);
    this.showForm = false;
    await this.refresh();
  }

  async deleteEvent(id: number) {
    if (confirm('¿Eliminar evento?')) {
      await this.service.delete(id);
      await this.refresh();
    }
  }

  cancelForm() { this.showForm = false; }
}