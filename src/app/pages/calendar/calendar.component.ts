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

  // En tu calendarOptions dentro de CalendarComponent
  calendarOptions: CalendarOptions = {
    locale: 'es', // Internacionalización a castellano
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    selectable: true,
    editable: true,
    height: '100%',
    // Ajuste responsivo de la cabecera
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    // Mejora para móviles: que el día clicado abra la vista de semana
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

  async ngOnInit() {
    await this.loadEvents();
  }

  async loadEvents() {
    const events = await this.calendarService.getAllEvents();
    this.calendarOptions.events = events;
  }

  handleDateClick(info: any) {
    this.selectedEvent = {
      title: '',
      start: info.dateStr + 'T09:00',
      end: info.dateStr + 'T10:00',
      extendedProps: {}
    };
    this.isFormVisible = true;
  }

  handleEventClick(info: any) {
    this.selectedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      extendedProps: info.event.extendedProps || {}
    };
    this.isFormVisible = true;
  }

  async handleEventChange(info: any) {
    const updatedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      extendedProps: info.event.extendedProps
    };
    await this.calendarService.updateEvent(updatedEvent.id, updatedEvent);
    await this.loadEvents();
  }

  closeForm() {
    this.isFormVisible = false;
    this.loadEvents(); // Recargar para ver cambios
  }
}