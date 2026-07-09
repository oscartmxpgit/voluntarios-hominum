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
      filtered = this.rawEvents.filter(e => e.patient_name);
    } else if (this.selectedFilter === 'events') {
      filtered = this.rawEvents.filter(e => !e.patient_name && e.title);
    }

    this.calendarEvents = filtered.map(e => {
      const titleValue = e.patient_name ? e.patient_name : (e.title || 'Evento sin título');

      return {
        id: String(e.id),
        title: titleValue,
        start: e.start_datetime,
        end: e.end_datetime,
        allDay: false
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
    const event = this.rawEvents.find(e => String(e.id) === String(info.event.id));
    if (!event) return;

    this.selectedEvent = { ...event };
    this.isFormVisible = true;
  }

  async handleEventChange(info: any): Promise<void> {
    const existingEvent = this.rawEvents.find(e => String(e.id) === String(info.event.id));
    if (!existingEvent) { info.revert(); return; }

    try {
      const updatedEvent = {
        ...existingEvent,
        start_datetime: info.event.start,
        end_datetime: info.event.end || info.event.start
      };

      await this.calendarService.updateEvent(info.event.id, updatedEvent);
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