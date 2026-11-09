import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  VolunteersService,
  Volunteer
} from '../../services/volunteers.service';

interface VolunteerEditForm {
  id: number;
  email: string;
  full_name: string;
  residencia: string;
}

interface VolunteerProfileUpdate {
  email: string;
  full_name: string | null;
  residencia: string | null;
}

@Component({
  selector: 'app-volunteers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.css']
})
export class VolunteersComponent implements OnInit {
  private volunteersService = inject(VolunteersService);

  @ViewChild('editDialog', { static: true })
  private editDialog!: ElementRef<HTMLDialogElement>;

  volunteers: Volunteer[] = [];

  loading = true;
  showForm = false;
  newEmail = '';

  creating = false;
  saving = false;

  pageError = '';
  editError = '';

  busyIds = new Set<number>();
  editingVolunteer: VolunteerEditForm | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    const apiError = error as {
      error?: {
        error?: unknown;
      };
    } | null;

    const message = apiError?.error?.error;

    return typeof message === 'string' && message
      ? message
      : fallback;
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.pageError = '';

    try {
      const rows = await this.volunteersService.getAll();

      this.volunteers = rows.map(
        (volunteer): Volunteer => ({
          ...volunteer,
          is_coordinator: Number(volunteer.is_coordinator),
          is_active: Number(volunteer.is_active),
          full_name: volunteer.full_name ?? null,
          residencia: volunteer.residencia ?? null
        })
      );
    } catch (error) {
      console.error('Error cargando usuarios:', error);

      this.pageError = this.getErrorMessage(
        error,
        'No se pudo cargar el listado de voluntarios.'
      );
    } finally {
      this.loading = false;
    }
  }

  openCreateModal(): void {
    this.newEmail = '';
    this.pageError = '';
    this.showForm = true;
  }

  async createVolunteer(): Promise<void> {
    const email = this.newEmail.trim();

    if (!email || this.creating) return;

    this.creating = true;
    this.pageError = '';

    try {
      await this.volunteersService.create({ email });

      this.showForm = false;
      this.newEmail = '';

      await this.loadData();
    } catch (error) {
      console.error('Error al crear usuario:', error);

      this.pageError = this.getErrorMessage(
        error,
        'No se pudo registrar al voluntario.'
      );
    } finally {
      this.creating = false;
    }
  }

  openEditModal(volunteer: Volunteer): void {
    if (this.busyIds.has(volunteer.id)) return;

    this.editError = '';

    // Copia independiente: cancelar no modifica la tabla.
    this.editingVolunteer = {
      id: volunteer.id,
      email: volunteer.email,
      full_name: volunteer.full_name ?? '',
      residencia: volunteer.residencia ?? ''
    };

    this.editDialog.nativeElement.showModal();
  }

  closeEditModal(): void {
    if (this.saving) return;

    this.editDialog.nativeElement.close();
    this.editingVolunteer = null;
    this.editError = '';
  }

  onEditCancel(event: Event): void {
    event.preventDefault();
    this.closeEditModal();
  }

  async saveVolunteer(): Promise<void> {
    const form = this.editingVolunteer;

    if (!form || this.saving) return;

    const id = form.id;

    const changes: VolunteerProfileUpdate = {
      email: form.email.trim(),
      full_name: form.full_name.trim() || null,
      residencia: form.residencia.trim() || null
    };

    if (
      changes.email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)
    ) {
      this.editError = 'Introduce un email válido.';
      return;
    }

    if (
      (changes.full_name?.length ?? 0) > 255 ||
      (changes.residencia?.length ?? 0) > 255
    ) {
      this.editError =
        'El nombre y la residencia no pueden superar los 255 caracteres.';
      return;
    }

    this.saving = true;
    this.editError = '';

    try {
      await this.volunteersService.update(id, changes);

      this.volunteers = this.volunteers.map(
        (volunteer): Volunteer =>
          volunteer.id === id
            ? { ...volunteer, ...changes }
            : volunteer
      );
    } catch (error) {
      console.error('Error al guardar el voluntario:', error);

      this.editError = this.getErrorMessage(
        error,
        'No se pudieron guardar los cambios.'
      );

      return;
    } finally {
      this.saving = false;
    }

    this.closeEditModal();
  }

  async toggleActive(
    volunteer: Volunteer,
    event: Event
  ): Promise<void> {
    const checkbox = event.target as HTMLInputElement;

    if (
      volunteer.is_coordinator === 1 ||
      this.busyIds.has(volunteer.id)
    ) {
      checkbox.checked = volunteer.is_active === 1;
      return;
    }

    const previousStatus = volunteer.is_active;
    const newStatus = checkbox.checked ? 1 : 0;

    this.busyIds.add(volunteer.id);
    this.pageError = '';

    try {
      await this.volunteersService.update(volunteer.id, {
        is_active: newStatus
      });

      volunteer.is_active = newStatus;
    } catch (error) {
      checkbox.checked = previousStatus === 1;

      console.error('Error al cambiar el estado:', error);

      this.pageError = this.getErrorMessage(
        error,
        'No se pudo cambiar el estado del voluntario.'
      );
    } finally {
      this.busyIds.delete(volunteer.id);
    }
  }

  async deleteUser(volunteer: Volunteer): Promise<void> {
    if (volunteer.is_coordinator === 1) {
      alert('No se puede eliminar a un coordinador.');
      return;
    }

    if (this.busyIds.has(volunteer.id)) return;

    const confirmed = confirm(
      `¿Seguro que deseas eliminar a ${volunteer.email}?`
    );

    if (!confirmed) return;

    this.busyIds.add(volunteer.id);
    this.pageError = '';

    try {
      await this.volunteersService.delete(volunteer.id);

      this.volunteers = this.volunteers.filter(
        item => item.id !== volunteer.id
      );
    } catch (error) {
      console.error('Error al eliminar usuario:', error);

      this.pageError = this.getErrorMessage(
        error,
        'No se pudo eliminar al voluntario.'
      );
    } finally {
      this.busyIds.delete(volunteer.id);
    }
  }
}