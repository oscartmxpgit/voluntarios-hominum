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
    const safeValue = value || {};

    // FIX: evitar slice(0,16) que rompe fechas
    this._eventData = {
      ...safeValue,
      start: safeValue.start ? this.toLocalInput(safeValue.start) : '',
      end: safeValue.end ? this.toLocalInput(safeValue.end) : '',
      extendedProps: safeValue.extendedProps ? { ...safeValue.extendedProps } : {}
    };
  }

  get eventData() {
    return this._eventData;
  }

  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  private calendarService = inject(CalendarService);

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    this.close.emit();
  }

  onDelete() {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      if (this.eventData?.id) {
        this.delete.emit(this.eventData.id);
      }
    }
  }

  onStartChange() {
    if (this._eventData.start) {
      const startDate = new Date(this._eventData.start);

      if (!isNaN(startDate.getTime())) {
        startDate.setHours(startDate.getHours() + 1);
        this._eventData.end = this.toLocalInput(startDate);
      }
    }
  }

  async save() {
    try {

      const start = new Date(this._eventData.start);
      const end = new Date(this._eventData.end);

      // FIX CRÍTICO: evitar Google Calendar 400
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Fechas inválidas');
      }

      if (end <= start) {
        throw new Error('La fecha fin debe ser posterior a la de inicio');
      }

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

  // FIX IMPORTANTE: formato correcto para datetime-local
  private toLocalInput(date: string | Date) {
    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}