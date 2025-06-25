import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Documento } from '../interfaces/documento';
import { ResponseDocumentHTML } from '../interfaces/responseDocumentoHTML';
import { delay, Observable, of, pipe, tap } from 'rxjs';
const environment = (window as any).__env as any;

const baseUrl = `${environment.API_GATEWAY_URL}/${environment.API_PATH_METRICAS}`;
const baseUrlDoc = `${environment.API_GATEWAY_URL}/${environment.API_PATH_EXPEDIENTES}`;

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {

  constructor(private http: HttpClient,
                public router: Router) { }

    getDocumentos(): Observable<Documento[]> {
      return this.http.get<Documento[]>(`${baseUrlDoc}/documento`);
    }

  getDocumentoGenerado(nUnico: number, codigoTemplate: string): Observable<ResponseDocumentHTML> {
    const url = `${baseUrl}/documento/generar-documento-web/${nUnico}/${codigoTemplate}`;
    return this.http.get<ResponseDocumentHTML>(url);
  }
  descargarDocx(nUnico: number, codigoTemplate: string): Observable<Blob> {
    const url = `${baseUrl}/documento/generar-documento-docx/${nUnico}/${codigoTemplate}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  getDocumentoGeneradoDataPaginated(body: any, page: number = 0, size: number = 10): Observable<any> {
        const url = `${baseUrl}/documento-generado-ia/get-data?page=${page}&size=${size}`;
        return this.http.post<any>(url, body);
  }

  getDocumentoGeneradoAcumulado(body: any): Observable<any> {
        const url = `${baseUrl}/documento-generado-ia/main`;
        return this.http.post<any>(url, body);
  }
  getConsultaIaTemas(body: any): Observable<any> {
        const url = `${baseUrl}/consulta-ia/temas`;
        return this.http.post<any>(url, body);
  }



}
