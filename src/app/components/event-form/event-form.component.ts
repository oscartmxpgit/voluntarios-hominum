import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css'] // Asegúrate de que esta línea exista
})
export class EventFormComponent {
  @Input() eventData: any = {};
  @Output() close = new EventEmitter<void>();
  private calendarService = inject(CalendarService);

  async save() {
    // IMPORTANTE: Asegurar que las fechas estén en formato compatible con Google
    // datetime-local envía 'YYYY-MM-DDTHH:mm', lo cual es correcto.
    if (this.eventData.id) {
      await this.calendarService.updateEvent(this.eventData.id, this.eventData);
    } else {
      await this.calendarService.createEvent(this.eventData);
    }
    this.close.emit();
  }
}