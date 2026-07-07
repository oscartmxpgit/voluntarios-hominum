import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';
import { AuthService } from '../../services/auth.service'; // Ensure AuthService is imported

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
  private _eventData: any = {};

  @Input()
  set eventData(value: any) {
    const safeValue = value || {};
    this._eventData = {
      ...safeValue,
      start_datetime: safeValue.start_datetime ? this.toLocalInput(safeValue.start_datetime) : '',
      end_datetime: safeValue.end_datetime ? this.toLocalInput(safeValue.end_datetime) : ''
    };
  }

  get eventData() {
    return this._eventData;
  }

  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  // In event-form.component.ts
  async ngOnInit(): Promise<void> {
    try {
      const currentUser = this.authService.user();

      if (currentUser && currentUser.id) {
        // Now you can directly use the numeric ID
        this.patients = await this.calendarService.getPatientsByVolunteer(currentUser.id);
      }
    } catch (err) {
      console.error('Error loading filtered patients:', err);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onDelete() {
    if (this.eventData?.id && confirm('¿Eliminar evento?')) {
      this.delete.emit(this.eventData.id);
    }
  }

  onStartChange() {
    if (!this._eventData.start_datetime || this._eventData.id) return;

    const start = new Date(this._eventData.start_datetime);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    this._eventData.end_datetime = this.toLocalInput(end);
  }

  async save() {
    try {
      if (!this._eventData.patient_id) {
        throw new Error('Debe seleccionar un paciente');
      }

      const start = new Date(this._eventData.start_datetime);
      const end = new Date(this._eventData.end_datetime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Fechas inválidas');
      }

      if (end <= start) {
        throw new Error('La fecha de fin debe ser posterior al inicio');
      }

      // Explicitly construct the payload to match the backend expectation
      const payload = {
        ...this._eventData,
        start_datetime: start,
        end_datetime: end
      };

      if (payload.id) {
        await this.calendarService.updateEvent(payload.id, payload);
      } else {
        await this.calendarService.createEvent(payload);
      }

      this.close.emit();
    } catch (e: any) {
      console.error('Save error:', e); // Added for easier debugging
      alert(e.message || 'Error al guardar');
    }
  }

  private toLocalInput(value: string | Date): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}