import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent {
  @Input() eventData: any = { title: '', start: '', end: '', extendedProps: {} };
  @Output() close = new EventEmitter<void>();
  private calendarService = inject(CalendarService);

  // Autocompletar fin: 1 hora después del inicio
  onStartChange() {
    if (this.eventData.start) {
      const startDate = new Date(this.eventData.start);
      startDate.setHours(startDate.getHours() + 1);
      // Formato requerido: YYYY-MM-DDTHH:mm
      this.eventData.end = startDate.toISOString().slice(0, 16);
    }
  }

  async save() {
    try {
      // Asegurar que el objeto extendedProps existe para no romper el servicio
      if (!this.eventData.extendedProps) this.eventData.extendedProps = {};
      
      if (this.eventData.id) {
        await this.calendarService.updateEvent(this.eventData.id, this.eventData);
      } else {
        await this.calendarService.createEvent(this.eventData);
      }
      this.close.emit();
    } catch (error) {
      console.error("Error al guardar en Google Calendar:", error);
      alert("Hubo un error al guardar. Verifica la consola.");
    }
  }
}