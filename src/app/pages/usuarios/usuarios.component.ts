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
import { Usuario, Role,TipoUser } from 'src/app/interfaces/usuarios';

@Component({
  selector: 'app-usuarios',
  imports: [
    CommonModule, SelectModule, TableModule, InputTextModule, FluidModule,
    ButtonModule, FormsModule, TooltipModule, DialogModule,CheckboxModule,
    MessageModule, ToastModule, PaginatorModule
  ],
  providers: [MessageService],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent {
  @ViewChild('cbuInstancia', { static: false }) cbuInstancia!: Dropdown;

  // filtros
  buscar: string = '';
  instancias: any[] = [];
  instanciaSeleccionada: number | null = 0;
  
  // Para Usuarios
  tipoUsuarios: TipoUser[] = [];
  displayCreateUsuarios: boolean = false;
  tipoUsuarioSeleccionado: string | null = null;
  documento: number | null = null;
  apellidos: string = '';
  nombres: string = '';
  cargo: string = '';
  anioExpediente: number | null = null;
  username = '';
  password = '';
  email = '';
  genero: number | null = null; 
  telefono = '';
  direccion = '';
  activo: number = 1;
  tipoDocumento: number = 1;  
  cargoId: number | null = null;  
  cargos: {id:number; nombre:string}[] = [];

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
    this.loadTipoUsuarios();
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
  loadTipoUsuarios() {
    this.usuariosService.getTipoUsuarios().subscribe({
      next: data => { this.tipoUsuarios = data || []; },
      error: err => console.error('Error al cargar tipo usuarios', err)
    });
  }

  nuevoUsuario() {
    
    this.tipoUsuarioSeleccionado = null;
    this.documento = null;
    this.apellidos = '';
    this.nombres = '';
    this.cargoId = null;         
    this.cargo = '';
    this.username = '';
    this.password = '';
    this.email = '';
    this.genero = null;
    this.telefono = '';
    this.direccion = '';
    this.activo = 1;
    this.tipoDocumento = 1;
    this.displayCreateUsuarios = true;
  }
  crearUsuario() {
    // --- Validaciones mínimas de UX ---
    const depId = this.instanciaSeleccionada ?? 0;
    const tipoUserId = this.tipoUsuarioSeleccionado;

    if (!tipoUserId) {
      this.service.add({ severity: 'warn', summary: 'Falta tipo', detail: 'Selecciona el tipo de usuario.' });
      return;
    }
    if (!this.documento || String(this.documento).trim().length < 8) {
      this.service.add({ severity: 'warn', summary: 'Documento inválido', detail: 'Ingresa DNI válido.' });
      return;
    }
    if (!this.apellidos.trim() || !this.nombres.trim()) {
      this.service.add({ severity: 'warn', summary: 'Faltan nombres', detail: 'Completa nombres y apellidos.' });
      return;
    }
    if (!depId || depId === 0) {
      this.service.add({ severity: 'warn', summary: 'Falta instancia', detail: 'Selecciona la instancia.' });
      return;
    }
    if (!this.username.trim() || !this.password.trim()) {
      this.service.add({ severity: 'warn', summary: 'Faltan credenciales', detail: 'Completa usuario y contraseña.' });
      return;
    }
    if (!this.email.trim() || !/^\S+@\S+\.\S+$/.test(this.email)) {
      this.service.add({ severity: 'warn', summary: 'Email inválido', detail: 'Revisa el correo.' });
      return;
    }

    // --- Mapeo EXACTO al body del backend que compartiste ---
    const payload: any = {
      tipoDocumento: this.tipoDocumento,
      documento: String(this.documento),
      apellidos: this.apellidos.trim(),
      nombres: this.nombres.trim(),
      dependencia: { id: depId },
      // Si tu backend pide cargo por ID:
      cargo: this.cargoId ? { id: this.cargoId } : null, // <-- si no tienes catálogo, déjalo null o ajusta backend
      // Si tu backend aceptara texto, sería: cargoNombre: this.cargo?.trim() || null,
      username: this.username.trim(),
      password: this.password.trim(),
      email: this.email.trim(),
      tipoUser: { id: tipoUserId },
      genero: this.genero ?? 1,
      telefono: this.telefono?.trim() || null,
      direccion: this.direccion?.trim() || null,
      activo: this.activo
    };

    this.isTyping = true;
    this.loaderMessage = 'Creando usuario...';
    this.botonLoader = false;

    this.usuariosService.createUser(payload).subscribe({
      next: () => {
        this.isTyping = false;
        this.loaderMessage = '';
        this.displayCreateUsuarios = false;

        this.service.add({ severity: 'success', summary: 'OK', detail: 'Usuario creado correctamente.' });
        this.buscarUsuarios(true); // refresca tabla
      },
      error: (err) => {
        this.isTyping = false;
        this.loaderMessage = '';
        this.service.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el usuario.' });
        console.error('Error crear usuario', err);
      }
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
