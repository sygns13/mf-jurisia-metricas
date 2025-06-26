import { Component, NgModule, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule  } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { MarkdownModule } from 'ngx-markdown';
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
import {Calendar} from 'primeng/calendar';

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
interface FilaAcumulado {
    instancia: string;
    especialidad: string;
    tipoDocumento: string;
    documento: string;
    juez: string;
    totalDocsGenerados: number;
}
interface FilaTemas {
    instancia: string;
    codInstancia: string;
    especialidad: string;
    codEspecialidad: string;
    consultas: number;
}
interface FilaUsuarioEspecialidad {
    instancia: string;
    codInstancia: string;
    idUser: number;
    documento: string;
    nombres: string;
    apellidos: string;
    username: string;
    cargoUsuario: string;
    codEspecialidad: string;
    especialidad: string;
    consultas: number;
  }
  interface ConsultaCabecera {
    id: number;
    userId: number;
    model: string;
    countMessages: number;
    firstSendMessage: string;
    lastSendMessage: string;
    firstResponseMessage: string;
    lastResponseMessage: string;
    sessionUID: string;
    regDate: string;
    regDatetime: string;
    regTimestamp: number;
    updDate: string | null;
    updDatetime: string | null;
    updTimestamp: number | null;
  }
  

@Component({
    selector: 'app-consultas',
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
        TooltipModule,
        DialogModule,
        Calendar,
        NgChartsModule,
        MarkdownModule
    ],
    providers: [MessageService],
    templateUrl: './consultas.component.html',
    styleUrl: './consultas.component.scss'
})
export class ConsultasComponent {
    private env = environment;

    displayFiltros: boolean = false;
    isTyping: boolean = false;
    loaderMessage: string = '';
    loaderMessageBody: string = '';
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

    tipoReporte: 'MISCONSULTAS' | 'TEMAS' | 'USUARIOS' | '' = '';
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
    expedientesAcumulado: FilaAcumulado[] = [];
    expedientesTemas: FilaTemas[] = [];
    expedientesUsuarios: FilaUsuarioEspecialidad[] = [];
    expedientesMisConsultas: ConsultaCabecera[] = [];
    detallesConversacion: any[] = [];
    displayDialogDetalles: boolean = false;

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
    }
    validarFiltros(): boolean {
        if(this.tipoReporte != 'MISCONSULTAS'){
            const camposFaltantes: string[] = [];
          
            if (!this.instanciaSeleccionada && this.instanciaSeleccionada !== '0') {
              camposFaltantes.push('Instancia');
            }
          
            if (!this.especialidadSeleccionada && this.especialidadSeleccionada !== '0') {
              camposFaltantes.push('Especialidad');
            }
          
            if (camposFaltantes.length > 0) {
                this.isTyping = true;
                this.loaderMessage = 'Filtros Obligatorios';
                this.loaderMessageBody = 'Por favor seleccione:<br> <b>' + camposFaltantes.join(', ')+'</b>';
                this.botonLoader = true;
                return false;
            }
          
            return true;
        }else{
            return true;
        }
      }
    onBuscar(): void {
        if (this.validarFiltros()) {
            this.loaderMessageBody = '';
            if (this.tipoReporte === 'MISCONSULTAS') {
                this.buscarReporteMisConsultas();
                this.buscado=true;
                this.displayFiltros = false;
            } else if (this.tipoReporte === 'TEMAS') {
                this.buscarReporteTemas();
                this.buscado=true;
                this.displayFiltros = false;
            } else if (this.tipoReporte === 'USUARIOS') {
                this.buscarReportexUsuarios();
                this.buscado=true;
                this.displayFiltros = false;
            }
        }else{
            this.displayFiltros = true;
        }
    }
    parseMarkdown(md: string): string {
        return marked.parse(md || '');
    }
      
    buscarReporteMisConsultas(): void {
        const body = {
            idUser: 25,
            model: "",
            documento: "",
            apellidos: "",
            nombres: "",
            cargo: "",
            username: "",
            email: "",
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };

        this.isTyping = true;
        this.loaderMessage = 'Generando reporte por usuarios...';
        this.botonLoader = false;
      
        this.documentoService.getConsultaIaMisConsultas(body, this.paginaActual, this.tamanioPagina).subscribe({
        next: (res) => {
            console.log(res.content);
            this.expedientesMisConsultas = res.content || [];
            this.totalRegistros = res.totalElements;
            this.paginaActual = res.number;
            this.buscado = true;
            this.isTyping = false;
            },
            error: (err) => {
            console.error('Error al buscar mis consultas', err);
            this.loaderMessage = 'Error al generar el reporte.';
            this.botonLoader = true;
            }
        });
    }    
    verDetalles(sessionUID: string): void {
        const body = {
            sessionUID,
            model: "",
            idUser: "",
            documento: "",
            apellidos: "",
            nombres: "",
            cargo: "",
            username: "",
            email: "",
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };
      
        this.documentoService.getConsultaIaDetalles(body, 0, 10).subscribe({
          next: (res) => {
            this.detallesConversacion = res.content || [];
            this.displayDialogDetalles = true;
          },
          error: (err) => {
            console.error('Error al obtener detalles de la sesión', err);
          }
        });
      }
      
    buscarReportexUsuarios(): void {
        const body = {
          codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
          idUser: null,
          codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
          fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
          fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };
      
        this.isTyping = true;
        this.loaderMessage = 'Generando reporte por usuarios...';
        this.botonLoader = false;
      
        this.documentoService.getConsultaIaxUsuarios(body).subscribe({
          next: (res) => {
            const filas: FilaUsuarioEspecialidad[] = [];
      
            res.usuarios.forEach((usuario: any) => {
              usuario.especialidades.forEach((esp: any) => {
                filas.push({
                  instancia: res.instancia,
                  codInstancia: res.codInstancia,
                  idUser: usuario.idUser,
                  documento: usuario.documento,
                  nombres: usuario.nombres,
                  apellidos: usuario.apellidos,
                  username: usuario.username,
                  cargoUsuario: usuario.cargoUsuario,
                  codEspecialidad: esp.codEspecialidad,
                  especialidad: esp.especialidad,
                  consultas: esp.consultas
                });
              });
            });
      
            this.expedientesUsuarios = filas;
            this.totalRegistros = filas.length;
            this.buscado = true;
            this.isTyping = false;

            this.graficosPorEspecialidad = res.usuarios.map((usuario: any) => {
                // Consolidar datos por especialidad (en caso de duplicados)
                const agregados: { [nombre: string]: number } = {};
                usuario.especialidades.forEach((esp: any) => {
                  if (!agregados[esp.especialidad]) {
                    agregados[esp.especialidad] = 0;
                  }
                  agregados[esp.especialidad] += esp.consultas;
                });
              
                const labels = Object.keys(agregados);
                const values = Object.values(agregados);
              
                return {
                  nombre: `${usuario.nombres} ${usuario.apellidos}`,
                  labels: labels,
                  barData: [{
                    label: 'Consultas por Especialidad',
                    data: values,
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    borderColor: '#b00600',
                    borderWidth: 1
                  }],
                  lineData: [{
                    label: 'Consultas por Especialidad',
                    data: values,
                    borderColor: '#b00600',
                    fill: false,
                    tension: 0.3
                  }]
                };
              });
              
          },
          error: (err) => {
            console.error('Error al buscar reporte por usuarios', err);
            this.loaderMessage = 'Error al generar el reporte.';
            this.botonLoader = true;
          }
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
        } else {
            this.especialidadesFiltradas = [];
        }
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
    onPaginar(event: any) {
        this.paginaActual = event.page;
        this.tamanioPagina = event.rows;
        this.buscarReporteMisConsultas(); // o pasa el page/size como body si tu API lo admite
      }
    buscarReporteTemas(): void {
        const body = {
            codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
            idUser: null,
            codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
        };

        this.isTyping = true;
        this.loaderMessage = 'Generando reporte...';
        this.botonLoader = false;

        this.documentoService.getConsultaIaTemas(body).subscribe({
            next: (res) => {
                // Transformar cada especialidad en una fila
                const filas: FilaTemas[] = res.especialidades.map((esp: any) => ({
                    instancia: res.instancia,
                    codInstancia: res.codInstancia,
                    especialidad: esp.especialidad,
                    codEspecialidad: esp.codEspecialidad,
                    consultas: esp.consultas
                }));

            this.expedientesTemas = filas; // Usa nueva variable
            this.totalRegistros = filas.length;
            this.buscado = true;
            this.isTyping = false;

            const labels = filas.map(f => f.especialidad);
            const data = filas.map(f => f.consultas);

            this.graficosPorEspecialidad = [{
            nombre: res.instancia,
            labels,
                barData: [{
                    label: 'Consultas',
                    data,
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    borderColor: '#b00600',
                    borderWidth: 1
                }],
                lineData: [{
                    label: 'Consultas',
                    data,
                    borderColor: '#b00600',
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    fill: false,
                    tension: 0.3
                }]
            }];
            },
            error: (err) => {
                console.error('Error al buscar documentos generados', err);
                this.loaderMessage = 'Error al generar el reporte.';
                this.botonLoader = true;
            }
        });
    }
    exportarPDF(): void {

        if (!this.buscado) {
            this.isTyping = true;
            this.loaderMessage = 'Alerta!';
            this.loaderMessageBody = 'Debe generar un reporte antes de exportar';
            this.botonLoader = true;
            return;
        }

        const config = {
          'MISCONSULTAS': {
            idContenedor: 'contenedorPdfMisConsultas',
            titulo: 'REPORTE DE MIS CONSULTAS',
            nombreArchivo: 'Reporte-mis-consultas.pdf'
          },
          'TEMAS': {
            idContenedor: 'contenedorPdfTemas',
            titulo: 'REPORTE DE CONSULTAS POR TEMAS',
            nombreArchivo: 'Reporte-consultas-por-temas.pdf'
          },
          'USUARIOS': {
            idContenedor: 'contenedorPdfUsuarios',
            titulo: 'REPORTE DE CONSULTAS POR USUARIOS',
            nombreArchivo: 'Reporte-consultas-por-usuarios.pdf'
          }
        };
      
        if (!this.tipoReporte || !(this.tipoReporte in config)) return;

        const currentConfig = config[this.tipoReporte as 'MISCONSULTAS' | 'TEMAS' | 'USUARIOS'];

        const dataElement = document.getElementById(currentConfig.idContenedor);
        if (!dataElement) return;
      
        html2canvas(dataElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
      
          const pageWidth = pdf.internal.pageSize.getWidth();
          const paddingX = 15;
          const imgWidth = pageWidth - paddingX * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
          const centerX = pageWidth / 2;
          let cursorY = 15;
      
          const logoUrl = 'assets/img/logo-csjan.png';
          const img = new Image();
          img.src = logoUrl;
          img.onload = () => {
            pdf.addImage(img, 'PNG', paddingX, cursorY, 20, 20);
      
            // Título institucional centrado
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
      
            const lines = [
              'CORTE SUPERIOR DE JUSTICIA DE ANCASH',
              'ASISTENTE VIRTUAL',
              'APUBOT',
              '',
              currentConfig.titulo
            ];
      
            lines.forEach((line, i) => {
              const y = cursorY + 5 + (i * 7);
              const textWidth = pdf.getTextWidth(line);
              pdf.text(line, centerX - (textWidth / 2) + 10, y);
            });
      
            const contentY = cursorY + (lines.length * 7) + 10;
            pdf.addImage(imgData, 'PNG', paddingX, contentY, imgWidth, imgHeight);
            pdf.save(currentConfig.nombreArchivo);
          };
        });
      }
      
          
}
