import { Component, EventEmitter, HostListener, Input, Output, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
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
export class EventFormComponent implements OnInit, OnChanges {
  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  patients: any[] = [];
  eventTypes: any[] = [];
  eventType: 'patient' | 'general' = 'patient';
  formModel: any = {};

  @Input() eventData: any = {};
  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  async ngOnInit(): Promise<void> {
    const currentUser = this.authService.user();
    if (currentUser?.id) {
      try {
        const [patientsData, typesData] = await Promise.all([
          this.calendarService.getPatientsByVolunteer(currentUser.id),
          this.calendarService.getGeneralEventTypes()
        ]);
        this.patients = patientsData || [];
        this.eventTypes = typesData || [];
        
        this.checkAndApplyDefaults();
      } catch (err) {
        console.error('Error al cargar catálogos:', err);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventData']) {
      const safeValue = this.eventData || {};
      
      this.formModel = {
        ...safeValue,
        patient_id: safeValue.patient_id ?? null,
        title: safeValue.title ?? null,
        start_datetime: safeValue.start_datetime ? this.toLocalInput(safeValue.start_datetime) : '',
        end_datetime: safeValue.end_datetime ? this.toLocalInput(safeValue.end_datetime) : '',
        comments: safeValue.comments ?? ''
      };
      
      this.eventType = this.formModel.patient_id ? 'patient' : (this.formModel.title ? 'general' : 'patient');
      
      this.checkAndApplyDefaults();
    }
  }

  private checkAndApplyDefaults(): void {
    if (!this.formModel.id) {
      if (this.eventType === 'patient') {
        if (this.patients.length === 1 && !this.formModel.patient_id) {
          this.formModel.patient_id = this.patients[0].id;
        }
        this.onPatientChange();
      } else if (this.eventType === 'general') {
        if (this.eventTypes.length === 1 && !this.formModel.title) {
          this.formModel.title = this.eventTypes[0].title;
        }
        this.onEventTypeChange();
      }
    }
  }

  onTypeChange() {
    if (this.eventType === 'patient') {
      this.formModel.title = null;
    } else {
      this.formModel.patient_id = null;
    }
    this.checkAndApplyDefaults();
  }

  onEventTypeChange() {
    // Buscar el tipo de evento seleccionado en el catálogo de BD
    const selectedType = this.eventTypes.find(type => type.title === this.formModel.title);
    
    if (selectedType && selectedType.start_datetime) {
      // Sobrescribir con la fecha y hora provenientes de la base de datos
      this.formModel.start_datetime = this.toLocalInput(selectedType.start_datetime);
      if (selectedType.end_datetime) {
        this.formModel.end_datetime = this.toLocalInput(selectedType.end_datetime);
      }
    } else {
      // Fallback si no tiene horas definidas
      this.initializeDefaultTimes();
    }
  }

  onPatientChange() {
    this.initializeDefaultTimes();
  }

  initializeDefaultTimes() {
    if (this.formModel.start_datetime) return;
    
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    
    this.formModel.start_datetime = this.toLocalInput(now);
    
    if (!this.formModel.end_datetime) {
      const end = new Date(now.getTime() + 60 * 60 * 1000);
      this.formModel.end_datetime = this.toLocalInput(end);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() { 
    this.close.emit(); 
  }

  onDelete() {
    if (this.formModel?.id && confirm('¿Eliminar evento?')) {
      this.delete.emit(this.formModel.id);
    }
  }

  onStartChange() {
    if (!this.formModel.start_datetime || this.formModel.id) return;
    const start = new Date(this.formModel.start_datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    this.formModel.end_datetime = this.toLocalInput(end);
  }

  async save() {
    try {
      if (this.eventType === 'patient' && !this.formModel.patient_id) throw new Error('Seleccione un paciente');
      if (this.eventType === 'general' && !this.formModel.title) throw new Error('Seleccione un tipo de evento');

      const payload = {
        ...this.formModel,
        type: this.eventType,
        start_datetime: new Date(this.formModel.start_datetime),
        end_datetime: new Date(this.formModel.end_datetime)
      };

      if (payload.id) await this.calendarService.updateEvent(payload.id, payload);
      else await this.calendarService.createEvent(payload);

      this.close.emit();
    } catch (e: any) {
      alert(e.message);
    }
  }

  private toLocalInput(value: string | Date): string {
    if (!value) return '';
    
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return value;
    }

    let dateStr = value;
    if (typeof value === 'string') {
      dateStr = value.replace(' ', 'T');
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}