import { Component, OnInit, inject } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { CalendarService } from '../../services/calendar.service';
import { EventFormComponent } from '../../components/event-form/event-form.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, EventFormComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  private calendarService = inject(CalendarService);
  private authService = inject(AuthService);

  isFormVisible = false;
  selectedEvent: any = null;
  private rawEvents: any[] = [];

  // Estado del filtro: 'all' | 'patients' | 'events'
  selectedFilter: string = 'all';

  calendarEvents: any[] = [];

  calendarOptions: CalendarOptions = {
    locale: 'es',
    allDayText: 'Todo el día',
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    selectable: true,
    editable: true,
    height: '100%',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    navLinks: true,
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' },
    dateClick: (info) => this.handleDateClick(info),
    eventClick: (info) => this.handleEventClick(info),
    eventDrop: (info) => this.handleEventChange(info),
    eventResize: (info) => this.handleEventChange(info),
    displayEventTime: false
  };

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    const allEvents = await this.calendarService.getAllEvents();
    const user = this.authService.user();

    this.rawEvents = allEvents.filter(e =>
      user?.isCoordinator ? true : (e.volunteer_id === user?.id)
    );

    this.applyFilter();
  }

  onFilterChange(filterType: string): void {
    this.selectedFilter = filterType;
    this.applyFilter();
  }

  applyFilter(): void {
    let filtered = this.rawEvents;

    if (this.selectedFilter === 'patients') {
      filtered = this.rawEvents.filter(e => e.patient_name || e.patient_id);
    } else if (this.selectedFilter === 'events') {
      filtered = this.rawEvents.filter(e => !e.patient_name && !e.patient_id && e.title);
    }

    this.calendarEvents = filtered.map(e => {
      const isPatientVisit = !!(e.patient_name || e.patient_id);
      const titleValue = e.patient_name ? e.patient_name : (e.title || 'Evento sin título');

      // ID compuesto único para evitar colisiones entre Visitas y Eventos
      const uniqueId = isPatientVisit ? `visit-${e.id}` : `event-${e.id}`;

      return {
        id: uniqueId,
        title: titleValue,
        start: e.start_datetime,
        end: e.end_datetime,
        allDay: false,
        extendedProps: {
          rawId: e.id,
          isPatientVisit,
          patient_name: e.patient_name,
          comments: e.comments
        }
      };
    });
  }

  handleDateClick(info: any): void {
    const start = new Date(info.date);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    this.selectedEvent = {
      start_datetime: start,
      end_datetime: end,
      patient_name: '',
      comments: ''
    };
    this.isFormVisible = true;
  }

  handleEventClick(info: any): void {
    const rawId = info.event.extendedProps?.rawId ?? info.event.id;
    const isPatientVisit = info.event.extendedProps?.isPatientVisit;

    const event = this.rawEvents.find(e => {
      const isMatchId = String(e.id) === String(rawId);
      if (!isMatchId) return false;

      const eIsPatient = !!(e.patient_name || e.patient_id);
      return isPatientVisit !== undefined ? eIsPatient === isPatientVisit : true;
    });

    if (!event) return;

    this.selectedEvent = { ...event };
    this.isFormVisible = true;
  }

  async handleEventChange(info: any): Promise<void> {
    const rawId = info.event.extendedProps?.rawId ?? info.event.id;
    const isPatientVisit = info.event.extendedProps?.isPatientVisit;

    // 1. Localizar el evento original sin ambigüedad de ID
    const existingEvent = this.rawEvents.find(e => {
      const isMatchId = String(e.id) === String(rawId);
      if (!isMatchId) return false;

      const eIsPatient = !!(e.patient_name || e.patient_id);
      return isPatientVisit !== undefined ? eIsPatient === isPatientVisit : true;
    });

    if (!existingEvent) {
      info.revert();
      return;
    }

    try {
      const newStart = new Date(info.event.start);

      // 2. Mantener la duración original si info.event.end viene nulo (muy habitual en vista mes)
      let newEnd: Date;
      if (info.event.end) {
        newEnd = new Date(info.event.end);
      } else if (existingEvent.start_datetime && existingEvent.end_datetime) {
        const origStart = new Date(existingEvent.start_datetime).getTime();
        const origEnd = new Date(existingEvent.end_datetime).getTime();
        const duration = Math.max(origEnd - origStart, 3600000); // Mínimo 1 hora
        newEnd = new Date(newStart.getTime() + duration);
      } else {
        newEnd = new Date(newStart.getTime() + 3600000);
      }

      // 3. Crear el objeto a actualizar conservando patient_name y formateando a ISO
      const updatedEvent = {
        ...existingEvent,
        start_datetime: newStart.toISOString(),
        end_datetime: newEnd.toISOString()
      };

      await this.calendarService.updateEvent(rawId, updatedEvent);
      await this.loadEvents();
    } catch (e) {
      console.error('Error actualizando evento tras drag&drop:', e);
      info.revert();
    }
  }

  async handleDeleteEvent(id: string): Promise<void> {
    await this.calendarService.deleteEvent(id);
    await this.closeForm();
  }

  async closeForm(): Promise<void> {
    this.isFormVisible = false;
    this.selectedEvent = null;
    await this.loadEvents();
  }
}