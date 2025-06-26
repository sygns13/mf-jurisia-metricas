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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
interface FilaAcumulado {
    instancia: string;
    especialidad: string;
    tipoDocumento: string;
    documento: string;
    juez: string;
    totalDocsGenerados: number;
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
    documentoDisabled: boolean = false;

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
    expedientesAcumulado: FilaAcumulado[] = [];

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

    validarFiltros(): boolean {
        const camposFaltantes: string[] = [];
      
        if (!this.instanciaSeleccionada && this.instanciaSeleccionada !== '0') {
          camposFaltantes.push('Instancia');
        }
      
        if (!this.especialidadSeleccionada && this.especialidadSeleccionada !== '0') {
          camposFaltantes.push('Especialidad');
        }
      
        if (!this.tipoDocumentoSeleccionado && this.tipoDocumentoSeleccionado !== 0) {
          camposFaltantes.push('Tipo de Documento');
        }
      
        if (!this.documentoSeleccionado && this.documentoSeleccionado !== 0) {
          camposFaltantes.push('Documento');
        }
      
        if (camposFaltantes.length > 0) {
            this.isTyping = true;
            this.loaderMessage = 'Filtros Obligatorios';
            this.loaderMessageBody = 'Por favor seleccione:<br> <b>' + camposFaltantes.join(', ')+'</b>';
            this.botonLoader = true;
            return false;
        }
      
        return true;
      }
      

    onBuscar(): void {
        if (this.validarFiltros()) {
            this.loaderMessageBody = '';
            if (this.tipoReporte === 'DETALLADO') {
                this.buscarReporteDocGenerados();
                this.buscado=true;
                this.displayFiltros = false;
            } else if (this.tipoReporte === 'ACUMULADO') {
                this.buscarReporteAcumulado();
                this.buscado=true;
                this.displayFiltros = false;
            } else if (this.tipoReporte === 'GRAFICOS') {
                this.cargarGraficos();
                this.buscado=true;
                this.displayFiltros = false;
            }
        }else{
            this.displayFiltros = true;
        }
    }

    buscarReporteAcumulado(): void {
        const body = {
            codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
            juez: "",
            fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
            fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
            codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
            idTipoDocumento: this.tipoDocumentoSeleccionado && this.tipoDocumentoSeleccionado !== 0 ? this.tipoDocumentoSeleccionado : "",
            idDocumento: this.documentoSeleccionado && this.documentoSeleccionado !== 0 ? this.documentoSeleccionado : "",
        };

        this.isTyping = true;
        this.loaderMessage = 'Generando reporte acumulado...';
        this.botonLoader = false;

        this.documentoService.getDocumentoGeneradoAcumulado(body).subscribe({
            next: (res) => {
                const filas: FilaAcumulado[] = [];

                const instancia = res.instancia || '';
                const juez = res.juez || '';

                (res.especialidades || []).forEach((esp: any) => {
                    const especialidad = esp.especialidad || '';

                    (esp.tipoDocumentos || []).forEach((tipo: any) => {
                        const tipoDocumento = tipo.tipoDocumento || '';

                        (tipo.documentos || []).forEach((doc: any) => {
                            filas.push({
                                instancia: instancia,
                                especialidad: especialidad,
                                tipoDocumento: tipoDocumento,
                                documento: doc.documento || '',
                                juez: juez,
                                totalDocsGenerados: doc.totalDoc || 0
                            });
                        });
                    });
                });

                this.expedientesAcumulado  = filas;
                this.totalRegistros = filas.length;
                this.buscado = true;
                this.isTyping = false;
            },
            error: (err) => {
                console.error('Error al buscar documentos generados', err);
                this.loaderMessage = 'Error al generar el reporte.';
                this.botonLoader = true;
            }
        });
    }

  cargarGraficos(): void {
      const body = {
          codInstancia: this.instanciaSeleccionada && this.instanciaSeleccionada !== '0' ? this.instanciaSeleccionada : "",
          juez: "",
          fechaInicio: this.fechaInicio ? this.fechaInicio.toISOString().slice(0, 10) : "",
          fechaFin: this.fechaFin ? this.fechaFin.toISOString().slice(0, 10) : "",
          codEspecialidad: this.especialidadSeleccionada && this.especialidadSeleccionada !== '0' ? this.especialidadSeleccionada : "",
          idTipoDocumento: this.tipoDocumentoSeleccionado && this.tipoDocumentoSeleccionado !== 0 ? this.tipoDocumentoSeleccionado : "",
          idDocumento: this.documentoSeleccionado && this.documentoSeleccionado !== 0 ? this.documentoSeleccionado : "",
      };

      this.isTyping = true;
      this.loaderMessage = 'Generando reporte...';
      this.botonLoader = false;

      this.documentoService.getDocumentoGeneradoAcumulado(body).subscribe({
          next: (res) => {
              const especialidades = res?.especialidades || [];

              this.graficosPorEspecialidad = especialidades.map((esp: any) => {
                  const documentosUnificados: { [docNombre: string]: number } = {};

                  esp.tipoDocumentos?.forEach((tipoDoc: any) => {
                      tipoDoc.documentos?.forEach((doc: any) => {
                          if (!documentosUnificados[doc.documento]) {
                              documentosUnificados[doc.documento] = 0;
                          }
                          documentosUnificados[doc.documento] += doc.totalDoc || 0;
                      });
                  });

                  const labels = Object.keys(documentosUnificados);
                  const values = Object.values(documentosUnificados);

                  return {
                      nombre: esp.especialidad,
                      labels: labels,
                      barData: [{
                          label: 'Total Documentos',
                          data: values,
                          backgroundColor: 'rgba(220, 53, 69, 0.6)',
                          borderColor: '#b00600',
                          borderWidth: 1
                      }],
                      lineData: [{
                          label: 'Total Documentos',
                          data: values,
                          borderColor: '#b00600',
                          fill: false,
                          tension: 0.3
                      }]
                  };
              });

              this.isTyping =  false;
          },
          error: (err) => {
              console.error('Error al generar gráfico', err);
              this.loaderMessage = 'Error al generar el gráfico.';
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
          this.documentoDisabled = filtrados.length === 0;
          if (this.documentoDisabled) {
            this.documentoSeleccionado = 0;
          }
      } else {
        this.documentosFiltrados = [];
        this.documentoDisabled = true;
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

    exportarPDF(): void {

        if (!this.buscado) {
            this.isTyping = true;
            this.loaderMessage = 'Alerta!';
            this.loaderMessageBody = 'Debe generar un reporte antes de exportar';
            this.botonLoader = true;
            return;
        }

        const config = {
          'DETALLADO': {
            idContenedor: 'contenedorPdfDetallado',
            titulo: 'REPORTE DE DOCUMENTOS GENERADOS - DETALLADO',
            nombreArchivo: 'Reporte-documentos-detallado.pdf'
          },
          'ACUMULADO': {
            idContenedor: 'contenedorPdfAcumulado',
            titulo: 'REPORTE DE DOCUMENTOS GENERADOS - ACUMULADO',
            nombreArchivo: 'Reporte-documentos-acumulado.pdf'
          },
          'GRAFICOS': {
            idContenedor: 'contenedorPdfGraficos',
            titulo: 'REPORTE DE DOCUMENTOS GENERADOS - GRÁFICOS',
            nombreArchivo: 'Reporte-documentos-graficos.pdf'
          }
        };
      
        if (!this.tipoReporte || !(this.tipoReporte in config)) return;

        const currentConfig = config[this.tipoReporte as 'DETALLADO' | 'ACUMULADO' | 'GRAFICOS'];

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
