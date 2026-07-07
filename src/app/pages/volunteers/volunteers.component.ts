import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VolunteersService, User } from '../../services/volunteers.service';

@Component({
  selector: 'app-volunteers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.css']
})
export class VolunteersComponent implements OnInit {
  private volunteersService = inject(VolunteersService);

  volunteers: User[] = [];
  loading = true;
  showForm = false;
  newEmail = '';

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      this.volunteers = await this.volunteersService.getAll();
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      this.loading = false;
    }
  }

  openCreateModal(): void {
    this.newEmail = '';
    this.showForm = true;
  }

  async createVolunteer(): Promise<void> {
    if (!this.newEmail) return;
    try {
      // Ajusta según cómo espera tu API la creación
      await this.volunteersService.create({ email: this.newEmail } as any);
      this.showForm = false;
      await this.loadData();
    } catch (error) {
      console.error('Error al crear usuario:', error);
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (user.is_coordinator === 1) {
      alert('No se puede eliminar a un coordinador.');
      return;
    }
    if (!confirm(`¿Seguro que deseas eliminar a ${user.email}?`)) return;
    try {
      await this.volunteersService.delete(user.id);
      await this.loadData();
    } catch (error) {
      console.error(error);
    }
  }
}