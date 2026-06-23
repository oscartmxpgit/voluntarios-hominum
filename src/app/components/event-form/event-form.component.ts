import { Component, Input, Output, EventEmitter, inject, HostListener } from '@angular/core';
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
  private _eventData: any = {};

  @Input() set eventData(value: any) {
    // Clonación profunda y segura para evitar errores de extensibilidad
    this._eventData = {
      ...value,
      start: value.start ? new Date(value.start).toISOString().slice(0, 16) : '',
      end: value.end ? new Date(value.end).toISOString().slice(0, 16) : '',
      // Aseguramos que extendedProps sea un objeto nuevo, independiente de la referencia original
      extendedProps: value.extendedProps ? { ...value.extendedProps } : {}
    };
  }

  get eventData() { return this._eventData; }

  @Output() close = new EventEmitter<void>();
  private calendarService = inject(CalendarService);

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    this.close.emit();
  }

  onStartChange() {
    if (this._eventData.start) {
      const startDate = new Date(this._eventData.start);
      if (!isNaN(startDate.getTime())) {
        startDate.setHours(startDate.getHours() + 1);
        this._eventData.end = startDate.toISOString().slice(0, 16);
      }
    }
  }

  async save() {
    try {
      // PREPARACIÓN PARA SUMMARY SERVICE:
      // Cuando guardamos, el CalendarService usa 'extendedProps' para crear 
      // la estructura 'extendedProperties.private' que SummaryService analiza.
      
      if (this._eventData.id) {
        await this.calendarService.updateEvent(this._eventData.id, this._eventData);
      } else {
        await this.calendarService.createEvent(this._eventData);
      }
      this.close.emit();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar. Verifica la consola.");
    }
  }
}