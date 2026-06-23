import { Component, OnInit, inject } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarService } from '../../services/calendar.service';
import { EventFormComponent } from '../../components/event-form/event-form.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, EventFormComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);

  isFormVisible = false;
  selectedEvent: any = null;

  calendarOptions: CalendarOptions = {
    locale: 'es',
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

    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },

    dateClick: (info) => this.handleDateClick(info),
    eventClick: (info) => this.handleEventClick(info),
    eventDrop: (info) => this.handleEventChange(info),
    eventResize: (info) => this.handleEventChange(info),

    events: []
  };

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    try {
      const googleEvents = await this.calendarService.getAllEvents();

      const fullCalendarEvents = googleEvents.map(event => ({
        id: event.id,
        title: event.summary,

        start:
          event.start?.dateTime ||
          event.start?.date,

        end:
          event.end?.dateTime ||
          event.end?.date,

        extendedProps:
          event.extendedProperties?.private || {}
      }));

      this.calendarOptions = {
        ...this.calendarOptions,
        events: fullCalendarEvents
      };

    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  }

  handleDateClick(info: any): void {
    this.selectedEvent = {
      title: '',
      start: `${info.dateStr}T09:00`,
      end: `${info.dateStr}T10:00`,
      extendedProps: {
        volunteerEmail: '',
        category: 'General',
        patientName: '',
        notes: ''
      }
    };

    this.isFormVisible = true;
  }

  handleEventClick(info: any): void {
    this.selectedEvent = {
      id: info.event.id,
      title: info.event.title,

      start: info.event.start
        ? info.event.start.toISOString()
        : null,

      end: info.event.end
        ? info.event.end.toISOString()
        : null,

      extendedProps: {
        ...info.event.extendedProps
      }
    };

    this.isFormVisible = true;
  }

  async handleEventChange(info: any): Promise<void> {
    try {
      const updatedEvent = {
        id: info.event.id,
        title: info.event.title,

        start: info.event.start
          ? info.event.start.toISOString()
          : null,

        end: info.event.end
          ? info.event.end.toISOString()
          : null,

        extendedProps: {
          ...info.event.extendedProps
        }
      };

      await this.calendarService.updateEvent(
        updatedEvent.id,
        updatedEvent
      );

      await this.loadEvents();
    } catch (error) {
      console.error('Error actualizando evento:', error);
      info.revert();
    }
  }

  async closeForm(): Promise<void> {
    this.isFormVisible = false;
    this.selectedEvent = null;

    await this.loadEvents();
  }
}