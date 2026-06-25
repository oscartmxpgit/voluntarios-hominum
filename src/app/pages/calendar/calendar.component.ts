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

    displayEventTime: false,

    eventDataTransform: (event) => ({
      ...event,
      title: String(event.title ?? ''),
      id: String(event.id ?? '')
    }),

    events: []
  };

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {

    const allEvents = await this.calendarService.getAllEvents();

    const userEmail = this.authService.getUserEmail();
    const isCoordinator = this.authService.user()?.isCoordinator;

    this.rawEvents = allEvents.filter(e =>
      isCoordinator ? true : e.volunteer_email === userEmail
    );

    console.log('EVENTS FINAL:', this.rawEvents);

    const mappedEvents = this.rawEvents.map(e => ({
      id: String(e.id),
      title: String(e.task_name ?? ''),
      start: new Date(e.start_datetime),
      end: new Date(e.end_datetime),
      allDay: false
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: mappedEvents
    };
  }

  handleDateClick(info: any): void {

    const start = new Date(info.date);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    this.selectedEvent = {
      task_name: '',
      start_datetime: start,
      end_datetime: end,
      patient_name: '',
      comments: ''
    };

    this.isFormVisible = true;
  }

  handleEventClick(info: any): void {

    const event = this.rawEvents.find(e => e.id == info.event.id);
    if (!event) return;

    this.selectedEvent = { ...event };
    this.isFormVisible = true;
  }

  async handleEventChange(info: any): Promise<void> {

    try {

      await this.calendarService.updateEvent(info.event.id, {
        task_name: info.event.title,
        start_datetime: info.event.start,
        end_datetime: info.event.end,
        patient_name: '',
        comments: ''
      });

      await this.loadEvents();

    } catch (e) {
      console.error(e);
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