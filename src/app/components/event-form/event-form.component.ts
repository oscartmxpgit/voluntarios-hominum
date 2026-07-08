import { Component, EventEmitter, HostListener, Input, Output, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit {
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  patients: any[] = [];
  eventTypes: any[] = [];
  eventType: 'patient' | 'general' = 'patient';
  private _eventData: any = {};

  @Input()
  set eventData(value: any) {
    const safeValue = value || {};
    this._eventData = {
      ...safeValue,
      start_datetime: safeValue.start_datetime ? this.toLocalInput(safeValue.start_datetime) : '',
      end_datetime: safeValue.end_datetime ? this.toLocalInput(safeValue.end_datetime) : ''
    };
    // Detectamos el tipo según la presencia de campos específicos
    this.eventType = safeValue.patient_id ? 'patient' : (safeValue.title ? 'general' : 'patient');
  }

  get eventData() { return this._eventData; }

  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  async ngOnInit(): Promise<void> {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      try {
        // 1. Cargamos pacientes
        this.patients = await this.calendarService.getPatientsByVolunteer(currentUser.id);

        // 2. Cargamos el catálogo de tipos de evento por separado
        // Asegúrate de que este método devuelva el array [ {name: 'Reunión'}, ... ]
        const types = await this.calendarService.getGeneralEventTypes();

        // Aquí asignamos específicamente a eventTypes
        this.eventTypes = types;

        console.log('Pacientes cargados:', this.patients);
        console.log('Tipos de evento cargados:', this.eventTypes);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    }
  }

  onTypeChange() {
    if (this.eventType === 'patient') {
      delete this._eventData.title;
      delete this._eventData.event_type_id;
    } else {
      delete this._eventData.patient_id;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.close.emit(); }

  onDelete() {
    if (this.eventData?.id && confirm('¿Eliminar evento?')) {
      this.delete.emit(this.eventData.id);
    }
  }

  onStartChange() {
    if (!this._eventData.start_datetime || this._eventData.id) return;
    const start = new Date(this._eventData.start_datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this._eventData.end_datetime = this.toLocalInput(end);
  }

  async save() {
    try {
      const payload = {
        ...this._eventData,
        type: this.eventType,
        start_datetime: new Date(this._eventData.start_datetime),
        end_datetime: new Date(this._eventData.end_datetime)
      };

      if (payload.id) await this.calendarService.updateEvent(payload.id, payload);
      else await this.calendarService.createEvent(payload);

      this.close.emit();
    } catch (e: any) {
      alert(e.message);
    }
  }

  private toLocalInput(value: string | Date): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}