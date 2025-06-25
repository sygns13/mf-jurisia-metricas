import { Component, NgModule, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
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
        NgChartsModule
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

    tipoReporte: 'TEMAS' | 'ACUMULADO' | 'GRAFICOS' | '' = '';
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
    onBuscar(): void {
        if (this.tipoReporte === 'TEMAS') {
            this.buscarReporteTemas();
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
            },
            error: (err) => {
                console.error('Error al buscar documentos generados', err);
                this.loaderMessage = 'Error al generar el reporte.';
                this.botonLoader = true;
            }
        });
    }

}
