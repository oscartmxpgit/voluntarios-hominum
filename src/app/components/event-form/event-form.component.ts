import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './event-form.component.html'
})
export class EventFormComponent {
  @Input() eventData: any = {};
  @Output() close = new EventEmitter<void>();
  private calendarService = inject(CalendarService);

  async save() {
    if (this.eventData.id) {
      await this.calendarService.updateEvent(this.eventData.id, this.eventData);
    } else {
      await this.calendarService.createEvent(this.eventData);
    }
    this.close.emit();
  }
}