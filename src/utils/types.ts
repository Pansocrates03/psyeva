type EstadoColegio = "activo" | "en revisión" | "inactivo";
export interface Colegio {
  id: number;
  nombre: string;
  ciudad: string;
  estudiantes: number;
  estado: EstadoColegio;
  fecha: string;
}

export interface EstudianteGrupo {
  id: number;
  nombre: string;
  curp: string;
  reporte?: string;
}

type EstadoGrupo = "completo" | "en_progreso" | "sin_iniciar";
export interface Grupo {
  id: number;
  nombre: string;
  grado: string;
  estado: EstadoGrupo;
  alumnosEncuestados: number;
  totalAlumnos: number;
  reportesPublicados: number;
  totalReportes: number;
  reporteGrupal: boolean;
  formularios: string[];
  estudiantes?: EstudianteGrupo[];
}