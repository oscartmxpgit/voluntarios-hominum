import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CalendarService } from '../../services/calendar.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // ==========================================================
  // TABS
  // ==========================================================
  activeTab: 'details' | 'comments' | 'attachments' = 'details';

  // ==========================================================
  // COMMENTS
  // ==========================================================
  newCommentText = '';
  commentsList: any[] = [];
  pendingCommentsQueue: string[] = [];

  // ==========================================================
  // ATTACHMENTS
  // ==========================================================
  /**
   * Existing files already stored on server.
   */
  attachmentsList: any[] = [];

  /**
   * New File objects selected by user but not uploaded yet.
   */
  pendingFiles: File[] = [];

  /**
   * Existing attachment IDs selected for deletion.
   *
   * We do NOT immediately delete when user presses "Eliminar"
   * because they might press Cancel afterwards.
   *
   * Actual deletion occurs when Guardar is pressed.
   */
  attachmentIdsToDelete: number[] = [];

  saving = false;

  // ==========================================================
  // INPUT / OUTPUT
  // ==========================================================
  @Input() eventData: any = {};
  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<string>();

  // ==========================================================
  // INIT
  // ==========================================================
  async ngOnInit(): Promise<void> {
    const currentUser = this.authService.user();

    if (!currentUser?.id) {
      return;
    }

    try {
      const patientsPromise = currentUser.isCoordinator
        ? this.calendarService.getAllPatients()
        : this.calendarService.getPatientsByVolunteer(currentUser.id);

      const [patientsData, typesData] = await Promise.all([
        patientsPromise,
        this.calendarService.getGeneralEventTypes()
      ]);

      this.patients = patientsData || [];
      this.eventTypes = typesData || [];

      this.checkAndApplyDefaults();
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  }

  // ==========================================================
  // EVENT INPUT CHANGED
  // ==========================================================
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['eventData']) {
      return;
    }

    const safeValue = this.eventData || {};

    this.formModel = {
      ...safeValue,
      patient_id: safeValue.patient_id ?? null,
      title: safeValue.title ?? null,
      start_datetime: safeValue.start_datetime
        ? this.toLocalInput(safeValue.start_datetime)
        : '',
      end_datetime: safeValue.end_datetime
        ? this.toLocalInput(safeValue.end_datetime)
        : ''
    };

    this.eventType = this.formModel.patient_id
      ? 'patient'
      : this.formModel.title
      ? 'general'
      : 'patient';

    // Reset comments UI state
    this.newCommentText = '';
    this.pendingCommentsQueue = [];

    // Reset attachment UI state
    this.pendingFiles = [];
    this.attachmentIdsToDelete = [];

    this.processComments(safeValue);
    this.processAttachments(safeValue);
    this.checkAndApplyDefaults();
  }

  // ==========================================================
  // TABS
  // ==========================================================
  setTab(tab: 'details' | 'comments' | 'attachments'): void {
    this.activeTab = tab;
  }

  // ==========================================================
  // COMMENTS
  // ==========================================================
  private processComments(rawEventData: any): void {
    let rawComments: any[] = [];

    if (Array.isArray(rawEventData.comments)) {
      rawComments = [...rawEventData.comments];
    } else if (rawEventData.comment || rawEventData.comments) {
      const textComment = rawEventData.comment ?? rawEventData.comments;

      if (typeof textComment === 'string' && textComment.trim() !== '') {
        rawComments = [
          {
            comment: textComment,
            comment_author_name:
              rawEventData.comment_author_name ||
              rawEventData.comment_author ||
              'Anónimo',
            created_at:
              rawEventData.created_at ||
              rawEventData.start_datetime ||
              new Date()
          }
        ];
      }
    }

    this.commentsList = rawComments
      .map((c) => {
        const authorName =
          c.comment_author_name ||
          c.author_name ||
          c.volunteer?.name ||
          c.volunteers?.name ||
          c.comment_author ||
          c.volunteer_name ||
          'Anónimo';

        return {
          ...c,
          comment_author_name: authorName,
          author_name: authorName
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();

        return dateB - dateA;
      });
  }

  addComment(): void {
    if (!this.newCommentText || this.newCommentText.trim() === '') {
      return;
    }

    const textToSave = this.newCommentText.trim();
    const currentUser = this.authService.user();
    const authorName = currentUser?.name || currentUser?.email || 'Anónimo';

    const newCommentObj = {
      comment: textToSave,
      comment_author_name: authorName,
      author_name: authorName,
      created_at: new Date(),
      // Useful only for UI.
      pending: true
    };

    this.commentsList = [newCommentObj, ...this.commentsList];
    this.pendingCommentsQueue.push(textToSave);
    this.newCommentText = '';
  }

  // ==========================================================
  // ATTACHMENTS
  // ==========================================================
  private processAttachments(rawEventData: any): void {
    if (Array.isArray(rawEventData.attachments)) {
      this.attachmentsList = [...rawEventData.attachments];
    } else {
      this.attachmentsList = [];
    }
  }

  get attachmentCount(): number {
    return this.attachmentsList.length + this.pendingFiles.length;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(input.files);
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    const maxFileSize = 10 * 1024 * 1024;

    for (const file of selectedFiles) {
      if (!allowedMimeTypes.includes(file.type)) {
        alert(`El archivo "${file.name}" no tiene un formato permitido.`);
        continue;
      }

      if (file.size > maxFileSize) {
        alert(`El archivo "${file.name}" supera los 10 MB.`);
        continue;
      }

      /*
       * We intentionally DO NOT reject duplicate names.
       *
       * Two files called:
       * photo.jpg
       * photo.jpg
       *
       * are valid because the server will assign different UUID filenames.
       */
      this.pendingFiles.push(file);
    }

    /*
     * Important:
     * Reset input so selecting the same file again fires the change event.
     */
    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  markAttachmentForRemoval(attachment: any): void {
    if (!attachment?.id) {
      return;
    }

    const confirmed = confirm(
      `¿Eliminar "${attachment.original_name}" al guardar el evento?`
    );

    if (!confirmed) {
      return;
    }

    this.attachmentIdsToDelete.push(attachment.id);

    /*
     * Remove visually now.
     * It is not physically deleted until Guardar.
     */
    this.attachmentsList = this.attachmentsList.filter(
      (item) => item.id !== attachment.id
    );
  }

  async downloadAttachment(attachment: any): Promise<void> {
    if (!this.formModel.id || !attachment?.id) {
      return;
    }

    try {
      const blob = await this.calendarService.downloadTimeEntryAttachment(
        this.formModel.id,
        attachment.id
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = attachment.original_name || 'archivo';

      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      alert('No se pudo descargar el archivo.');
    }
  }

  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return '📄';
    }

    if (mimeType?.startsWith('image/')) {
      return '🖼️';
    }

    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes === null || bytes === undefined) {
      return '';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;

    return `${mb.toFixed(1)} MB`;
  }

  // ==========================================================
  // DATES
  // ==========================================================
  formatDateEs(dateVal: any): string {
    if (!dateVal) {
      return '';
    }

    const date = new Date(dateVal);

    if (isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // ==========================================================
  // DEFAULTS
  // ==========================================================
  private checkAndApplyDefaults(): void {
    if (this.formModel.id) {
      return;
    }

    if (this.eventType === 'patient') {
      if (this.patients.length === 1 && !this.formModel.patient_id) {
        this.formModel.patient_id = this.patients[0].id;
      }

      this.onPatientChange();
    } else if (this.eventType === 'general') {
      if (this.eventTypes.length === 1 && !this.formModel.title) {
        this.formModel.title = this.eventTypes[0].name;
      }

      this.onEventTypeChange();
    }
  }

  onTypeChange(): void {
    if (this.eventType === 'patient') {
      this.formModel.title = null;
    } else {
      this.formModel.patient_id = null;
    }

    this.checkAndApplyDefaults();
  }

  onEventTypeChange(): void {
    const selectedType = this.eventTypes.find(
      (type) => type.name === this.formModel.title
    );

    if (selectedType && selectedType.start_datetime) {
      this.formModel.start_datetime = this.toLocalInput(
        selectedType.start_datetime
      );

      if (selectedType.end_datetime) {
        this.formModel.end_datetime = this.toLocalInput(
          selectedType.end_datetime
        );
      }
    } else {
      this.initializeDefaultTimes();
    }
  }

  onPatientChange(): void {
    this.initializeDefaultTimes();
  }

  initializeDefaultTimes(): void {
    if (this.formModel.start_datetime) {
      return;
    }

    const now = new Date();

    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);

    this.formModel.start_datetime = this.toLocalInput(now);

    if (!this.formModel.end_datetime) {
      const end = new Date(now.getTime() + 60 * 60 * 1000);

      this.formModel.end_datetime = this.toLocalInput(end);
    }
  }

  onStartChange(): void {
    if (!this.formModel.start_datetime || this.formModel.id) {
      return;
    }

    const start = new Date(this.formModel.start_datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    this.formModel.end_datetime = this.toLocalInput(end);
  }

  // ==========================================================
  // DELETE EVENT
  // ==========================================================
  onDelete(): void {
    if (this.formModel?.id && confirm('¿Eliminar evento?')) {
      this.delete.emit(this.formModel.id);
    }
  }

  // ==========================================================
  // SAVE
  // ==========================================================
  async save(): Promise<void> {
    if (this.saving) {
      return;
    }

    this.saving = true;

    try {
      // -------------------------------------------------------
      // VALIDATION
      // -------------------------------------------------------
      if (this.eventType === 'patient' && !this.formModel.patient_id) {
        throw new Error('Seleccione un paciente');
      }

      if (this.eventType === 'general' && !this.formModel.title) {
        throw new Error('Seleccione un tipo de evento');
      }

      if (!this.formModel.start_datetime) {
        throw new Error('Seleccione la fecha de inicio');
      }

      if (!this.formModel.end_datetime) {
        throw new Error('Seleccione la fecha de fin');
      }

      // -------------------------------------------------------
      // COMMENT STILL IN TEXTAREA
      // -------------------------------------------------------
      if (this.newCommentText && this.newCommentText.trim() !== '') {
        this.addComment();
      }

      // -------------------------------------------------------
      // BUILD EVENT PAYLOAD
      // -------------------------------------------------------
      const payload = {
        ...this.formModel,
        type: this.eventType,
        start_datetime: new Date(this.formModel.start_datetime),
        end_datetime: new Date(this.formModel.end_datetime),
        comments: this.pendingCommentsQueue
      };

      let timeEntryId: number;

      // -------------------------------------------------------
      // UPDATE EXISTING EVENT
      // -------------------------------------------------------
      if (payload.id) {
        timeEntryId = Number(payload.id);

        await this.calendarService.updateEvent(timeEntryId, payload);
      } else {
        // -----------------------------------------------------
        // CREATE NEW EVENT
        // -----------------------------------------------------
        const created = await this.calendarService.createEvent(payload);

        if (!created?.id) {
          throw new Error(
            'El servidor no devolvió el ID del nuevo evento.'
          );
        }

        timeEntryId = Number(created.id);
      }

      // -------------------------------------------------------
      // DELETE ATTACHMENTS SELECTED FOR REMOVAL
      // -------------------------------------------------------
      for (const attachmentId of this.attachmentIdsToDelete) {
        await this.calendarService.deleteTimeEntryAttachment(
          timeEntryId,
          attachmentId
        );
      }

      // -------------------------------------------------------
      // UPLOAD NEW FILES
      // -------------------------------------------------------
      if (this.pendingFiles.length > 0) {
        await this.calendarService.uploadTimeEntryAttachments(
          timeEntryId,
          this.pendingFiles
        );
      }

      // -------------------------------------------------------
      // DONE
      // -------------------------------------------------------
      this.close.emit();
    } catch (e: any) {
      console.error(e);

      alert(
        e?.error?.error || e?.message || 'No se pudo guardar el evento.'
      );
    } finally {
      this.saving = false;
    }
  }

  // ==========================================================
  // ESCAPE
  // ==========================================================
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving) {
      this.close.emit();
    }
  }

  // ==========================================================
  // LOCAL DATETIME CONVERSION
  // ==========================================================
  private toLocalInput(value: string | Date): string {
    if (!value) {
      return '';
    }

    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ) {
      return value;
    }

    let dateStr: string | Date = value;

    if (typeof value === 'string') {
      dateStr = value.replace(' ', 'T');
    }

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}