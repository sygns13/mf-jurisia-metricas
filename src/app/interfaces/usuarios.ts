export interface Role {
    id: number;
    name: string;
    descripcion: string;
  }
  
  export interface TipoUser {
    id: number;
    nombre: string;
    descripcion: string;
    activo: number;
    borrado: number;
  }
  
  export interface Dependencia {
    id: number;
    codigo: string;
    nombre: string;
    sigla: string;
    dependenciaId: number | null;
    activo: number;
    borrado: number;
  }
  
  export interface Usuario {
    id: number;
    tipoDocumento: number;
    documento: string;
    apellidos: string;
    nombres: string;
    dependencia: Dependencia;
    cargo: string | null;
    username: string;
    email: string;
    tipoUser: TipoUser;
    genero: number | null;
    telefono: string | null;
    direccion: string | null;
    activo: number;
    borrado: number;
    roles: Role[];
  }
  
  export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
  }
  