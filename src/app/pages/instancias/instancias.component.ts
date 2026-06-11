import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Dropdown } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';

import { UsuariosService } from 'src/app/services/usuarios.service';
import { Usuario, Role } from 'src/app/interfaces/usuarios';

@Component({
  selector: 'app-instancias',
  imports: [
    CommonModule, SelectModule, TableModule, InputTextModule, FluidModule,
    ButtonModule, FormsModule, TooltipModule, DialogModule,CheckboxModule,
    MessageModule, ToastModule, PaginatorModule
  ],
  providers: [MessageService],
  templateUrl: './instancias.component.html',
  styleUrl: './instancias.component.scss'
})
export class InstanciasComponent {
@ViewChild('cbuInstancia', { static: false }) cbuInstancia!: Dropdown;

  // filtros
  buscar: string = '';
  instancias: any[] = [];
  instanciaSeleccionada: number | null = 0;

  // tabla
  usuarios: Usuario[] = [];
  totalRecords = 0;
  pageSize = 5;
  pageIndex = 0;
  loading = false;

  // loader ApuBot
  isTyping = false;
  loaderMessage = '';
  botonLoader = false;

 // Roles dialog
  showRolesDialog = false;
  rolesSistema: Role[] = [];
  selectedRoleIds: number[] = [];
  currentUserForRoles: Usuario | null = null;

  constructor(
    private service: MessageService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    this.loadInstancias();
    this.buscarUsuarios(true);
  }

  loadInstancias() {
    this.usuariosService.getInstancias().subscribe({
      next: (resp) => {
        const data = resp || [];
        console.log(resp);
        this.instancias = [{ codigoInstancia: 0, instancia: 'Todos' }, ...data];
        if (this.instanciaSeleccionada == null) this.instanciaSeleccionada = 0;
      },
      error: (err) => console.error('Error al cargar instancias', err)
    });
  }

  buscarUsuarios(resetPage: boolean = false) {
    if (resetPage) this.pageIndex = 0;

    this.usuariosService
      .listarUsuarios({
        buscar: this.buscar,
        dependenciaId: this.instanciaSeleccionada ?? null,
        page: this.pageIndex,
        size: this.pageSize
      })
      .subscribe({
        next: (page) => {
          this.usuarios = page.content;
          this.totalRecords = page.totalElements;

          if (!page.content || page.content.length === 0) {
            this.service.add({
              severity: 'info',
              summary: 'Sin resultados',
              detail: 'No se encontraron usuarios con los criterios ingresados.'
            });
          }
        },
        error: (err) => {
          this.service.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo realizar la búsqueda. Intente nuevamente.'
          });
          console.error('Error al listar usuarios', err);
        }
      });
  }

  /** Evento de lazy load/paginación del p-table */
  onLazyLoad(event: any) {
    // event.first = índice de fila inicial, event.rows = tamaño de página
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    this.pageIndex = Math.floor(first / rows);
    this.pageSize = rows;
    this.buscarUsuarios(false);
  }

   // ------- ROLES -------
   openRolesDialog(user: Usuario) {
    this.currentUserForRoles = user;
    this.selectedRoleIds = (user.roles || []).map(r => r.id);

    this.isTyping = true;
    this.loaderMessage = 'Cargando roles...';

    this.usuariosService.getRoles().subscribe({
      next: (roles) => {
        this.rolesSistema = roles || [];
        this.isTyping = false;
        this.loaderMessage = '';
        this.showRolesDialog = true;
      },
      error: (err) => {
        this.isTyping = false;
        this.loaderMessage = '';
        this.service.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los roles.' });
        console.error(err);
      }
    });
  }

  toggleRole(roleId: number, checked: boolean) {
    if (checked) {
      if (!this.selectedRoleIds.includes(roleId)) this.selectedRoleIds.push(roleId);
    } else {
      this.selectedRoleIds = this.selectedRoleIds.filter(id => id !== roleId);
    }
  }

  saveUserRoles() {
    if (!this.currentUserForRoles) return;
    const userId = this.currentUserForRoles.id;

    this.isTyping = true;
    this.loaderMessage = 'Guardando roles...';

    this.usuariosService.updateUserRoles(userId, this.selectedRoleIds).subscribe({
      next: () => {
        // Refleja cambios en la tabla sin recargar desde servidor
        const idx = this.usuarios.findIndex(u => u.id === userId);
        if (idx > -1) {
          this.usuarios[idx] = {
            ...this.usuarios[idx],
            roles: this.rolesSistema.filter(r => this.selectedRoleIds.includes(r.id))
          };
        }
        this.isTyping = false;
        this.loaderMessage = '';
        this.showRolesDialog = false;
        this.service.add({ severity: 'success', summary: 'OK', detail: 'Roles actualizados.' });
      },
      error: (err) => {
        this.isTyping = false;
        this.loaderMessage = '';
        this.service.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron actualizar los roles.' });
        console.error(err);
      }
    });
  }

  closeRolesDialog() {
    this.showRolesDialog = false;
    this.currentUserForRoles = null;
    this.selectedRoleIds = [];
  }

  // acción existente
  actionUsuario(user: Usuario) {
    console.log('Acción sobre usuario:', user);
  }

  cerrarLoader(){
    this.botonLoader=false;
    this.isTyping = false;
    this.loaderMessage = '';
  }
}
