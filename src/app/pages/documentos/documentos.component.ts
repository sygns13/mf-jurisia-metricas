import { Component, NgModule, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { CalendarModule } from 'primeng/calendar';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import {Button, ButtonDirective, ButtonModule} from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import {Select, SelectModule} from 'primeng/select';
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

interface DocumentoResumen {
  documento: string;
  total: number;
}

interface TipoDocumentoResumen {
  tipoDocumento: string;
  documentos: DocumentoResumen[];
}

interface EspecialidadResumen {
  nombre: string;
  tiposDocumento: TipoDocumentoResumen[];
}

interface DataGraficos {
  instancia: string;
  juez: string;
  especialidades: EspecialidadResumen[];
}

interface GraficoPorEspecialidad {
  nombre: string;
  labels: string[];
  barData: ChartDataset<'bar'>[];
  lineData: ChartDataset<'line'>[];
}


@Component({
    selector: 'app-documentos',
    imports: [
        CommonModule,
        CalendarModule,
        SelectModule,
      NgChartsModule,
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
        Button,
        Select
    ],
    providers: [MessageService],
    templateUrl: './documentos.component.html',
    styleUrl: './documentos.component.scss'
})
export class DocumentosComponent {
    private env = environment;

    displayFiltros: boolean = false;
    isTyping: boolean = false;
    loaderMessage: string = '';
    botonLoader: boolean = false;
    expedientes: Expediente[] = [];
    displayFiltroExpedientes: boolean = false;

    // Filtros
    sedeSeleccionada: string | null = null;
    instanciaSeleccionada: string | null = null;
    especialidadSeleccionada: string | null = null;
    tipoDocumentoSeleccionado: number | null = null;
    documentoSeleccionado: number | null = null;
    fechaInicio: Date  | null = null;
    fechaFin: Date  | null = null;

    totalRegistros: number = 0;
    paginaActual: number = 0;
    tamanioPagina: number = 10;

    tipoReporte: 'DETALLADO' | 'ACUMULADO' | 'GRAFICOS' | '' = '';
    buscado: boolean = false;

    //Listas para grafico
    public barChartOptions: ChartOptions<'bar'> | undefined;
    public barChartLabels: string[] = [];
    public barChartData: ChartDataset<'bar'>[] = [];

    public graficosPorEspecialidad: GraficoPorEspecialidad[] = [];
    public lineChartOptions: ChartOptions<'line'> = {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true }
      }
    };


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
        const hoy = new Date();
        this.fechaFin = hoy;
        this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        this.loadSedes();
        this.loadInstancias();
        this.loadEspecialidades();
        this.loadTipoDocumentos();
        this.loadDocumentos();
    }

    onBuscar(): void {
        if (this.tipoReporte === 'DETALLADO') {
            this.buscarReporteDocGenerados();
            this.buscado=true;
        } else if (this.tipoReporte === 'ACUMULADO') {
            this.buscarReporteAcumulado();
            this.buscado=true;
        } else if (this.tipoReporte === 'GRAFICOS') {
            this.cargarGraficos();
            this.buscado=true;
        }
    }

    buscarReporteAcumulado(): void {
        const body = {
            idUser: null,
            documento: "",
            apellidos: "",
            nombres: "",
            cargo: "",
            username: "",
            email: "",
            typedoc: "",
            codSede: this.sedeSeleccionada || "",
            codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
            codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
            codMateria: "",
            numeroExpediente: "",
            yearExpediente: "",
            idDocumento: this.documentoSeleccionado && this.documentoSeleccionado !== 0 ? this.documentoSeleccionado : "",
            idTipoDocumento: this.tipoDocumentoSeleccionado && this.tipoDocumentoSeleccionado !== 0 ? this.tipoDocumentoSeleccionado : "",
            nUnico: "",
            xFormato: "",
            dniDemandante: "",
            dniDemandado: "",
            templateCode: "",
            templateID: 1,
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };

        this.isTyping = true;
        this.loaderMessage = 'Generando reporte acumulado...';
        this.botonLoader = false;

    }

  cargarGraficos(): void {
    const datos: DataGraficos = {
      instancia: "2° JUZGADO PAZ LETRADO - Sede Central",
      juez: "MONTES MELENDEZ, PAUL JONATHAN",
      especialidades: [
        {
          nombre: "FAMILIA CIVIL",
          tiposDocumento: [
            {
              tipoDocumento: "AUTO",
              documentos: [
                { documento: "AUTO ADMISORIO", total: 4 },
                { documento: "AUTO APELACION", total: 6 }
              ]
            },
            {
              tipoDocumento: "OFICIO",
              documentos: [
                { documento: "OFICIO NACION", total: 4 },
                { documento: "OFICIO SUNAT", total: 6 }
              ]
            }
          ]
        },
        {
          nombre: "CIVIL",
          tiposDocumento: [
            {
              tipoDocumento: "RESOLUCION",
              documentos: [
                { documento: "RESOLUCION FINAL", total: 8 },
                { documento: "RESOLUCION INTERLOCUTORIA", total: 3 }
              ]
            }
          ]
        },
        {
          nombre: "PENAL",
          tiposDocumento: [
            {
              tipoDocumento: "SENTENCIA",
              documentos: [
                { documento: "SENTENCIA CONDENA", total: 10 },
                { documento: "SENTENCIA ABSOLUTORIA", total: 2 }
              ]
            }
          ]
        }
      ]
    };

    // Transformar los datos en formato para el gráfico
    this.graficosPorEspecialidad = datos.especialidades.map((especialidad) => {
      const documentosUnificados: { [nombre: string]: number } = {};

      // Agrupar documentos por nombre (independientemente del tipo)
      especialidad.tiposDocumento.forEach(tipo => {
        tipo.documentos.forEach(doc => {
          if (!documentosUnificados[doc.documento]) {
            documentosUnificados[doc.documento] = 0;
          }
          documentosUnificados[doc.documento] += doc.total;
        });
      });

      const labels = Object.keys(documentosUnificados);
      const values = Object.values(documentosUnificados);

      return {
        nombre: especialidad.nombre,
        labels: labels,
        barData: [
          {
            label: 'Total Documentos 2025',
            data: values,
            backgroundColor: 'rgba(220, 53, 69, 0.6)',
            borderColor: '#b00600',
            borderWidth: 1
          }
        ],
        lineData: [
          {
            label: 'Total Documentos 2025',
            data: values,
            borderColor: '#b00600',
            fill: false,
            tension: 0.3
          }
        ]
      };
    });
  }

  cerrarLoader() {
        this.botonLoader = false;
        this.isTyping = false;
        this.loaderMessage = '';
    }

    loadSedes() {
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
            this.instanciasFiltradas = this.instancias.filter((instancia) => instancia.codigoSede === this.sedeSeleccionada);
        } else {
            this.instanciasFiltradas = [];
        }
    }
    loadInstancias() {
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
            const filtradas = this.especialidades.filter(e => e.codigoInstancia === this.instanciaSeleccionada);
            this.especialidadesFiltradas = [
                {
                    codigoEspecialidad: '0',
                    especialidad: 'TODOS',
                    codigoInstancia: this.instanciaSeleccionada,
                    codigoCodEspecialidad: '' // ← propiedad obligatoria
                },
                ...filtradas
            ];
            this.tipoDocumentoLoad();

        } else {
            this.especialidadesFiltradas = [];
        }
    }
    tipoDocumentoLoad() {
        this.documentoSeleccionado = null;
        this.tipoDocumentoSeleccionado = null;
        this.documentosFiltrados = [];
        const filtrados = this.tipoDocumentos.filter(td => td.idInstancia === this.instanciaSeleccionada);
        this.tipoDocumentosFiltrados = [
            {
                idTipoDocumento: 0,
                descripcion: 'TODOS',
                idInstancia: this.instanciaSeleccionada || ''
            },
            ...filtrados
        ];
    }
    loadEspecialidades() {
        this.expedientesService.getEspecialidades().subscribe({
            next: (response: Especialidad[]) => {
                this.especialidades = response;
            },
            error: (err) => {
                console.error('Error al cargar especialidades', err);
            }
        });
    }
    loadTipoDocumentos() {
        this.tipodocumentoService.getTipoDocumentos().subscribe({
            next: (response: TipoDocumento[]) => {
                this.tipoDocumentos = response;
                this.tipoDocumentoLoad();
            },
            error: (err) => {
                console.error('Error al cargar tipo de cumentos', err);
            }
        });
    }
    onTipoDocumentoChange(event: any) {
      this.documentoSeleccionado = null;
      if (this.tipoDocumentoSeleccionado || this.tipoDocumentoSeleccionado===0) {
          const filtrados = this.documentos.filter(doc => doc.idTipoDocumento === this.tipoDocumentoSeleccionado);

          this.documentosFiltrados = [
              {
                  idDocumento: 0,
                  descripcion: 'TODOS',
                  idTipoDocumento: this.tipoDocumentoSeleccionado,
                  codigoTemplate: ''
              },
              ...filtrados
          ];
      } else {
        this.documentosFiltrados = [];
      }
    }
    loadDocumentos() {
        this.documentoService.getDocumentos().subscribe({
            next: (response: Documento[]) => {
                this.documentos = response;
            },
            error: (err) => {
                console.error('Error al cargar documentos', err);
            }
        });
    }
    buscarReporteDocGenerados(page: number = 0): void {
        const body = {
            idUser: null,
            documento: "",
            apellidos: "",
            nombres: "",
            cargo: "",
            username: "",
            email: "",
            typedoc: "",
            codSede: this.sedeSeleccionada || "",
            codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
            codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
            codMateria: "",
            numeroExpediente: "",
            yearExpediente: "",
            idDocumento: this.documentoSeleccionado && this.documentoSeleccionado !== 0 ? this.documentoSeleccionado : "",
            idTipoDocumento: this.tipoDocumentoSeleccionado && this.tipoDocumentoSeleccionado !== 0 ? this.tipoDocumentoSeleccionado : "",
            nUnico: "",
            xFormato: "",
            dniDemandante: "",
            dniDemandado: "",
            templateCode: "",
            templateID: "",
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };

        this.isTyping = true;
        this.loaderMessage = 'Generando reporte...';
        this.botonLoader = false;

        this.documentoService.getDocumentoGeneradoDataPaginated(body, page, this.tamanioPagina).subscribe({
            next: (res) => {
                this.expedientes = res.content || [];
                this.totalRegistros = res.totalElements;
                this.paginaActual = res.number;
                this.isTyping = false;
            },
            error: (err) => {
                console.error('Error al buscar documentos generados', err);
                this.loaderMessage = 'Error al generar el reporte.';
                this.botonLoader = true;
            }
        });
    }
    onPaginar(event: any): void {
        this.tamanioPagina = event.rows;
        this.paginaActual = event.page;
        this.buscarReporteDocGenerados(this.paginaActual);
    }



}
