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
        
        // Trigger auto-selection if the catalogs loaded after the input was set
        this.checkAndApplyDefaults();
      } catch (err) {
        console.error('Error loading data catalogs:', err);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventData']) {
      const safeValue = this.eventData || {};
      
      // Map incoming calendar tracking data directly to our form bindings
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
    // Only apply automation rules to brand-new entries
    if (!this.formModel.id) {
      
      // 1. Auto-select if there is exactly 1 patient in the catalog
      if (this.patients.length === 1 && !this.formModel.patient_id) {
        this.formModel.patient_id = this.patients[0].id;
      }

      // 2. Auto-select if there is exactly 1 event type category available
      if (this.eventTypes.length === 1 && !this.formModel.title) {
        this.formModel.title = this.eventTypes[0].title;
      }

      // 3. Fallback timestamp rendering if the calendar did not provide any dates
      if (!this.formModel.start_datetime) {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
        
        this.formModel.start_datetime = this.toLocalInput(now);
        
        if (!this.formModel.end_datetime) {
          const end = new Date(now.getTime() + 60 * 60 * 1000);
          this.formModel.end_datetime = this.toLocalInput(end);
        }
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
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}