import { Component, NgModule, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import {Button, ButtonDirective, ButtonModule} from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule  } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { MessageService, ToastMessageOptions } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ConsultagptService } from 'src/app/services/consultagpt.service';
import { IRequest, GptResponse, GptHistoryItem, HistoryResponse } from 'src/app/interfaces/consultagpt';
import { ExpedientesService } from 'src/app/services/expedientes.service';
import { Sede, Instancia, Especialidad, Expediente, BusquedaExpediente } from 'src/app/interfaces/expedientes';
import { TipodocumentoService } from 'src/app/services/tipodocumento.service';
import { DocumentoService } from 'src/app/services/documento.service';
import { marked } from 'marked';
import { SoloNumerosEnterosDirective } from '../directives/solo-numeros-enteros.directive';
import { Dropdown } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TipoDocumento } from 'src/app/interfaces/tipodocumento';
import { Documento } from 'src/app/interfaces/documento';

const environment = (window as any).__env as any;

@Component({
    selector: 'app-documentos',
    imports: [
        CommonModule,
        SelectModule,
        TableModule,
        InputTextModule,
        FluidModule,
        ButtonModule,
        FormsModule,
        TextareaModule,
        MessageModule,
        ToastModule,
        PanelMenuModule,
        PaginatorModule,
        SoloNumerosEnterosDirective,
        TooltipModule,
        DialogModule,
        ButtonDirective,
        Button,
        ButtonDirective,
        Button
    ],
    providers: [MessageService],
    templateUrl: './documentos.component.html',
    styleUrl: './documentos.component.scss'
})
export class DocumentosComponent {
    private env = environment;

    displayFiltros: boolean = false;
    isTyping: boolean = false;
    loaderMessage: string='';
    botonLoader: boolean = false;
    expedientes: Expediente[] = [];
    displayFiltroExpedientes: boolean = false;

    // Filtros
    sedeSeleccionada: string | null = null;
    instanciaSeleccionada: string | null = null;
    especialidadSeleccionada: string | null = null;

    // Listas de opciones
    sedes: Sede[] = [];
    instancias: Instancia[] = [];
    instanciasFiltradas: Instancia[] = [];
    especialidadesFiltradas: Especialidad[] = [];
    especialidades: Especialidad[] = [];
    tipoDocumentosFiltrados: TipoDocumento[] = [];
    tipoDocumentos: TipoDocumento[] = [];
    documentosFiltrados: Documento[] = [];
    documentos: Documento[] = [];

    constructor(
        private service: MessageService,
        private documentoService: DocumentoService,
        private tipodocumentoService: TipodocumentoService,
        private expedientesService: ExpedientesService
    ) {
        console.log('Environment from Microfront:');
        console.log(this.env);
    }

  ngOnInit(): void {
    this.loadSedes();
    this.loadInstancias();
    this.loadEspecialidades();
    this.loadTipoDocumentos();
    this.loadDocumentos();
  }

  cerrarLoader(){
    this.botonLoader=false;
    this.isTyping = false;
    this.loaderMessage = ''
  }

  loadSedes(){
      console.log("hola");
    this.expedientesService.getSedes().subscribe({
      next: (response: Sede[]) => {
        this.sedes = response;
        if (this.sedes.length > 0) {
          this.sedeSeleccionada = this.sedes[0].codigoSede;
          this.expedientesService.getInstancias().subscribe({
            next: (response: Instancia[]) => {
              this.instancias = response;
              this.onSedeChange({ value: this.sedeSeleccionada });
            },
            error: (err) => {
              console.error('Error al cargar instancias', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar sedes', err);
      }
    });
  }
  onSedeChange(event: any) {
    this.instanciaSeleccionada = null;
    this.especialidadesFiltradas = [];
    if (this.sedeSeleccionada) {
      this.instanciasFiltradas = this.instancias.filter(instancia => instancia.codigoSede === this.sedeSeleccionada);
    } else {
      this.instanciasFiltradas = [];
    }
  }
  loadInstancias(){
    this.expedientesService.getInstancias().subscribe({
      next: (response: Instancia[]) => {
        this.instancias = response;
      },
      error: (err) => {
        console.error('Error al cargar instancias', err);
      }
    });
  }
  onInstanciaChange(event: any) {
    this.especialidadSeleccionada = null;
    if (this.instanciaSeleccionada) {
      this.especialidadesFiltradas = this.especialidades.filter(especialidad => especialidad.codigoInstancia === this.instanciaSeleccionada);
    } else {
      this.especialidadesFiltradas = [];
    }
  }
  loadEspecialidades(){
    this.expedientesService.getEspecialidades().subscribe({
      next: (response: Especialidad[]) => {
        this.especialidades = response;
      },
      error: (err) => {
        console.error('Error al cargar especialidades', err);
      }
    });
  }
  loadTipoDocumentos(){
    this.tipodocumentoService.getTipoDocumentos().subscribe({
      next: (response: TipoDocumento[]) => {
        this.tipoDocumentos = response;
      },
      error: (err) => {
        console.error('Error al cargar tipo de cumentos', err);
      }
    });
  }

  loadDocumentos(){
    this.documentoService.getDocumentos().subscribe({
      next: (response: Documento[]) => {
        this.documentos = response;
      },
      error: (err) => {
        console.error('Error al cargar documentos', err);
      }
    });
  }
  buscarReporteDocGenerados(event: any) {

  }

}
