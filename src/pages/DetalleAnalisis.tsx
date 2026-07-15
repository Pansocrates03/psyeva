import { useState, type ChangeEvent, type FormEvent } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import Drawer from "../components/Drawer";
import Modal from "../components/Modal";
import COLORS from "../utils/Colors";
import DetalleAnalisisGrupos from "@/components/layouts/DetalleAnalisisGrupos";
import DetalleAnalisisEstudiantes from "@/components/layouts/DetalleAnalisisEstudiantes"
import DetalleAnalisisDatos from "@/components/layouts/DetalleAnalisisDatos";

// ── Tipos ────────────────────────────────────────────────────
type EstadoGrupo = "completo" | "en_progreso" | "sin_iniciar";
type FaseAnalisis = "configuracion" | "publicacion" | "recoleccion" | "archivo";

interface Formulario {
  id: number;
  nombre: string;
  categoria: string;
  preguntas: number;
  asignado: boolean;
}

interface EstudianteGrupo {
  id: number;
  nombre: string;
  curp: string;
  reporte?: string;
  respuestas?: string[];
}

interface Grupo {
  id: number;
  nombre: string;
  estado: EstadoGrupo;
  alumnosEncuestados: number;
  totalAlumnos: number;
  reportesPublicados: number;
  totalReportes: number;
  reporteGrupal: boolean;
  formularios: string[];
  estudiantes?: EstudianteGrupo[];
}

interface AlumnoForm {
  id: number;
  nombre: string;
  curp: string;
}

interface EstudianteTablaRow extends EstudianteGrupo {
  grupoNombre: string;
  grupoId: number;
  respuestas: string[];
}

interface CrearGrupoFormState {
  nombre: string;
  grado: string;
  encuestas: string[];
  estadoReporte: "privado" | "publico";
  reporteGrupal: string;
  encuestaEmociones: string;
  encuestaBienestar: string;
  encuestaAprendizaje: string;
  alumnos: AlumnoForm[];
}

// ── Datos de muestra ─────────────────────────────────────────
const FORMULARIOS_DISPONIBLES: Formulario[] = [
  { id: 1, nombre: "Emociones primaria baja",   categoria: "Emociones",   preguntas: 12, asignado: true  },
  { id: 2, nombre: "Emociones primaria alta",  categoria: "Emociones",   preguntas: 18, asignado: true  },
  { id: 3, nombre: "Emociones secundaria", categoria: "Emociones", preguntas: 15, asignado: true  },
  { id: 4, nombre: "Bienestar primaria baja", categoria: "Bienestar",  preguntas: 10, asignado: false },
  { id: 5, nombre: "Bienestar primaria alta", categoria: "Bienestar",  preguntas: 10, asignado: false },
  { id: 6, nombre: "Bienestar secundaria", categoria: "Bienestar",  preguntas: 10, asignado: false },
  { id: 7, nombre: "Aprendizaje primaria baja", categoria: "Aprendizaje",  preguntas: 10, asignado: false },
  { id: 8, nombre: "Aprendizaje primaria alta", categoria: "Aprendizaje",  preguntas: 10, asignado: false },
  { id: 9, nombre: "Aprendizaje secundaria", categoria: "Aprendizaje",  preguntas: 10, asignado: false },
];

const GRUPOS_DATA: Grupo[] = [
  {
    id: 1,
    nombre: "1ro A",
    estado: "completo",
    alumnosEncuestados: 28,
    totalAlumnos: 28,
    reportesPublicados: 28,
    totalReportes: 28,
    reporteGrupal: true,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 101, nombre: "Juan Pérez", curp: "JUAP123456HDFRRL01", reporte: "reporte_juan_perez.pdf", respuestas: ["Siempre", "Muchas veces", "Nunca", "A veces", "Siempre", "Nunca", "A veces", "Siempre"] },
      { id: 102, nombre: "María López", curp: "MALO123456HDFRRL02", respuestas: ["Muchas veces", "Siempre", "A veces", "Nunca", "Siempre", "A veces", "Nunca", "Siempre"] },
    ],
  },
  {
    id: 2,
    nombre: "1ro B",
    estado: "completo",
    alumnosEncuestados: 38,
    totalAlumnos: 38,
    reportesPublicados: 38,
    totalReportes: 38,
    reporteGrupal: true,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 201, nombre: "Carlos García", curp: "CAGA123456HDFRRL03", reporte: "reporte_carlos_garcia.pdf", respuestas: ["Siempre", "Muchas veces", "Nunca", "A veces", "Siempre", "Nunca", "A veces", "Siempre"] },
      { id: 202, nombre: "Ana Torres", curp: "ANAT123456HDFRRL04", respuestas: ["A veces", "Nunca", "Siempre", "Muchas veces", "A veces", "Siempre", "Nunca", "Siempre"] },
    ],
  },
  {
    id: 3,
    nombre: "1ro C",
    estado: "completo",
    alumnosEncuestados: 28,
    totalAlumnos: 28,
    reportesPublicados: 28,
    totalReportes: 28,
    reporteGrupal: true,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 301, nombre: "Luis Hernández", curp: "LUHE123456HDFRRL05", respuestas: ["Siempre", "A veces", "Nunca", "Siempre", "Muchas veces", "Nunca", "A veces", "Siempre"] },
    ],
  },
  {
    id: 4,
    nombre: "2do A",
    estado: "en_progreso",
    alumnosEncuestados: 24,
    totalAlumnos: 32,
    reportesPublicados: 20,
    totalReportes: 28,
    reporteGrupal: false,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 401, nombre: "Sofía Ramírez", curp: "SORA123456HDFRRL06", respuestas: ["A veces", "Siempre", "Nunca", "Muchas veces", "A veces", "Siempre", "Nunca", "Siempre"] },
    ],
  },
  {
    id: 5,
    nombre: "2do B",
    estado: "en_progreso",
    alumnosEncuestados: 28,
    totalAlumnos: 28,
    reportesPublicados: 28,
    totalReportes: 28,
    reporteGrupal: false,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 501, nombre: "Diego Morales", curp: "DIMO123456HDFRRL07", respuestas: ["Siempre", "Nunca", "A veces", "Siempre", "Muchas veces", "Nunca", "A veces", "Siempre"] },
    ],
  },
  {
    id: 6,
    nombre: "3ro A",
    estado: "sin_iniciar",
    alumnosEncuestados: 0,
    totalAlumnos: 25,
    reportesPublicados: 0,
    totalReportes: 25,
    reporteGrupal: false,
    formularios: ["Emociones", "Bienestar", "Aprendizaje"],
    estudiantes: [
      { id: 601, nombre: "Paula Ortega", curp: "PAOR123456HDFRRL08", respuestas: ["Nunca", "A veces", "Siempre", "Nunca", "Siempre", "A veces", "Nunca", "Siempre"] },
    ],
  },
];

const createAlumno = (): AlumnoForm => ({ id: Date.now() + Math.random(), nombre: "", curp: "" });

const emptyGrupoForm = (): CrearGrupoFormState => ({
  nombre: "",
  grado: "",
  encuestas: [],
  estadoReporte: "privado",
  reporteGrupal: "",
  encuestaEmociones: "",
  encuestaBienestar: "",
  encuestaAprendizaje: "",
  alumnos: [createAlumno()],
});

const buildEstudiantesTabla = (gruposData: Grupo[]): EstudianteTablaRow[] =>
  gruposData.flatMap(grupo =>
    (grupo.estudiantes ?? []).map(estudiante => ({
      ...estudiante,
      grupoNombre: grupo.nombre,
      grupoId: grupo.id,
      respuestas: estudiante.respuestas ?? [],
    }))
  );

const FASES: Array<{ key: FaseAnalisis; label: string; description: string }> = [
  { key: "configuracion", label: "Configuración", description: "Configuración inicial" },
  { key: "publicacion", label: "Publicación", description: "Publicación" },
  { key: "recoleccion", label: "Recopilación", description: "Recopilación" },
  { key: "archivo", label: "Archivo", description: "Archivo" },
];

// ── Página principal ──────────────────────────────────────────
export default function DetalleAnalisis() {
  const [grupos, setGrupos] = useState<Grupo[]>(() =>
    GRUPOS_DATA.map(grupo => ({
      ...grupo,
      estudiantes: (grupo.estudiantes ?? []).map(estudiante => ({ ...estudiante }))
    }))
  );
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [showCrearGrupo, setShowCrearGrupo] = useState(false);
  const [grupoEditandoId, setGrupoEditandoId] = useState<number | null>(null);
  const [grupoForm, setGrupoForm] = useState<CrearGrupoFormState>(emptyGrupoForm());
  const [layout, setLayout] = useState<"grupos" | "estudiantes" | "datos">("grupos");
  const [faseActual, setFaseActual] = useState<FaseAnalisis>("configuracion");
  const [fasePendiente, setFasePendiente] = useState<FaseAnalisis | null>(null);

  const totalAlumnos    = grupos.reduce((s, g) => s + g.totalAlumnos, 0);
  const totalReportes   = grupos.reduce((s, g) => s + g.reportesPublicados, 0);
  const pendientes      = grupos.reduce((s, g) => s + (g.totalAlumnos - g.alumnosEncuestados), 0);
  const gruposPendientes = grupos.filter(g => g.estado !== "completo").length;
  const estudiantesTabla: EstudianteTablaRow[] = buildEstudiantesTabla(grupos);

  const toggleEncuesta = (encuesta: string) => {
    setGrupoForm(prev => ({
      ...prev,
      encuestas: prev.encuestas.includes(encuesta)
        ? prev.encuestas.filter(item => item !== encuesta)
        : [...prev.encuestas, encuesta],
    }));
  };

  const updateAlumno = (index: number, field: "nombre" | "curp", value: string) => {
    setGrupoForm(prev => ({
      ...prev,
      alumnos: prev.alumnos.map((alumno, alumnoIndex) => alumnoIndex === index ? { ...alumno, [field]: value } : alumno),
    }));
  };

  const addAlumno = () => {
    setGrupoForm(prev => ({ ...prev, alumnos: [...prev.alumnos, createAlumno()] }));
  };

  const removeAlumno = (index: number) => {
    setGrupoForm(prev => ({
      ...prev,
      alumnos: prev.alumnos.filter((_, alumnoIndex) => alumnoIndex !== index),
    }));
  };

  const handleReporteUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGrupoForm(prev => ({ ...prev, reporteGrupal: file.name }));
  };

  const resetGrupoForm = () => {
    setGrupoForm(emptyGrupoForm());
    setGrupoEditandoId(null);
  };

  const abrirDrawerCrear = () => {
    resetGrupoForm();
    setShowCrearGrupo(true);
  };

  const abrirDrawerEditar = (grupo: Grupo) => {
    setGrupoEditandoId(grupo.id);
    setGrupoForm({
      nombre: grupo.nombre,
      grado: grupo.grado,
      encuestas: grupo.formularios.map(formulario => {
        if (formulario === "Emociones") return "Encuesta emociones";
        if (formulario === "Bienestar") return "Encuesta bienestar emocional";
        if (formulario === "Aprendizaje") return "Encuesta aprendizaje";
        return formulario;
      }),
      estadoReporte: grupo.reporteGrupal ? "publico" : "privado",
      reporteGrupal: grupo.reporteGrupal ? "Reporte grupal actual" : "",
      encuestaEmociones: "",
      encuestaBienestar: "",
      encuestaAprendizaje: "",
      alumnos: (grupo.estudiantes ?? []).map(estudiante => ({ id: estudiante.id, nombre: estudiante.nombre, curp: estudiante.curp })),
    });
    setShowCrearGrupo(true);
  };

  const handleCreateGrupo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!grupoForm.nombre.trim() || !grupoForm.grado.trim()) return;

    const alumnosValidos = grupoForm.alumnos.filter(alumno => alumno.nombre.trim() || alumno.curp.trim());
    const totalAlumnosGrupo = alumnosValidos.length;
    const estudiantesParaGrupo = alumnosValidos.map((alumno, index) => ({
      id: alumno.id || Date.now() + index,
      nombre: alumno.nombre.trim(),
      curp: alumno.curp.trim(),
      reporte: "",
    }));

    if (grupoEditandoId !== null) {
      setGrupos(prev => prev.map(grupo => grupo.id === grupoEditandoId
        ? {
            ...grupo,
            nombre: grupoForm.nombre.trim(),
            grado: grupoForm.grado.trim(),
            reporteGrupal: Boolean(grupoForm.reporteGrupal),
            formularios: grupoForm.encuestas,
            estudiantes: estudiantesParaGrupo,
            totalAlumnos: totalAlumnosGrupo,
            totalReportes: totalAlumnosGrupo,
            alumnosEncuestados: Math.min(grupo.alumnosEncuestados, totalAlumnosGrupo),
            reportesPublicados: Math.min(grupo.reportesPublicados, totalAlumnosGrupo),
          }
        : grupo));
    } else {
      const nuevoGrupo: Grupo = {
        id: Date.now(),
        nombre: grupoForm.nombre.trim(),
        grado: grupoForm.grado.trim(),
        estado: totalAlumnosGrupo > 0 ? "en_progreso" : "sin_iniciar",
        alumnosEncuestados: 0,
        totalAlumnos: totalAlumnosGrupo,
        reportesPublicados: 0,
        totalReportes: totalAlumnosGrupo,
        reporteGrupal: Boolean(grupoForm.reporteGrupal),
        formularios: grupoForm.encuestas,
        estudiantes: estudiantesParaGrupo,
      };

      setGrupos(prev => [nuevoGrupo, ...prev]);
    }

    setShowCrearGrupo(false);
    resetGrupoForm();
  };

  const handleUploadReporteEstudiante = (grupoId: number, estudianteId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGrupos(prev => prev.map(grupo => {
      if (grupo.id !== grupoId) return grupo;

      return {
        ...grupo,
        estudiantes: (grupo.estudiantes ?? []).map(estudiante => estudiante.id === estudianteId ? { ...estudiante, reporte: file.name } : estudiante),
      };
    }));
  };

  const confirmarCambioFase = (nuevaFase: FaseAnalisis) => {
    if (nuevaFase === faseActual) {
      setFasePendiente(null);
      return;
    }

    setFasePendiente(nuevaFase);
  };

  const aplicarCambioFase = () => {
    if (!fasePendiente) return;
    setFaseActual(fasePendiente);
    setFasePendiente(null);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Análisis
            </p>
            <h1 style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 600, color: COLORS.neutro900 }}>
              Instituto Oviedo
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.neutro500 }}>
              12 de febrero de 2026
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {FASES.map(fase => {
              const active = faseActual === fase.key;
              return (
                <button
                  key={fase.key}
                  onClick={() => confirmarCambioFase(fase.key)}
                  style={{
                    border: active ? `1px solid ${COLORS.violeta400}` : `1px solid ${COLORS.neutro100}`,
                    background: active ? COLORS.violeta50 : "#fff",
                    color: active ? COLORS.violeta600 : COLORS.neutro700,
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {fase.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Grupos" value={grupos.length} active={layout == "grupos"} onClick={() => setLayout("grupos")} />
          <StatCard label="Estudiantes" value={totalAlumnos} active={layout == "estudiantes"} onClick={() => setLayout("estudiantes")} />
          <StatCard label="Datos" value={totalReportes + '%'} active={layout == "datos"} sub='de los alumnos han finalizado las encuestas' onClick={() => setLayout("datos")} />
        </div>

        {/* Layout principal */}
        {layout == "grupos" ? (
          <DetalleAnalisisGrupos
            grupos={grupos}
            onSelectGrupo={(grupo) => {
              setGrupoSeleccionado(current => current?.id === grupo.id ? null : grupo);
              abrirDrawerEditar(grupo);
            }}
            onCreateGrupo={abrirDrawerCrear}
            onCloseDetalle={() => setGrupoSeleccionado(null)}
          />
          
        ) : layout == "estudiantes" ? (
          <DetalleAnalisisEstudiantes
            estudiantes={estudiantesTabla}
            onClose={() => setLayout("grupos")}
            onUploadReporte={handleUploadReporteEstudiante}
          />
        ) : (
          <DetalleAnalisisDatos
            estudiantes={estudiantesTabla}
            onClose={() => setLayout("grupos")}
            onUploadReporte={handleUploadReporteEstudiante}
          />
        )}
      </main>

      {fasePendiente && (
        <Modal
          title="Cambiar de fase"
          onClose={() => setFasePendiente(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.neutro700 }}>
              ¿Estás seguro de cambiar el análisis a <strong>{FASES.find(fase => fase.key === fasePendiente)?.description}</strong>?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setFasePendiente(null)}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, background: "#fff", color: COLORS.neutro700, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={aplicarCambioFase}
                style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: COLORS.violeta400, color: "#fff", cursor: "pointer" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Drawer open={showCrearGrupo} onClose={() => {
        setShowCrearGrupo(false);
        resetGrupoForm();
      }} title={grupoEditandoId ? "Editar grupo" : "Crear grupo"}>
        <form onSubmit={handleCreateGrupo} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Nombre del grupo
            </label>
            <input
              value={grupoForm.nombre}
              onChange={event => setGrupoForm(prev => ({ ...prev, nombre: event.target.value }))}
              type="text"
              placeholder="Ej. 1ro A"
              style={{
                width: "100%", padding: "9px 12px",
                border: `1px solid ${COLORS.neutro100}`, borderRadius: 8,
                fontSize: 14, color: COLORS.neutro900, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Grado
            </label>
            <input
              value={grupoForm.grado}
              onChange={event => setGrupoForm(prev => ({ ...prev, grado: event.target.value }))}
              type="text"
              placeholder="Ej. Primero de primaria"
              style={{
                width: "100%", padding: "9px 12px",
                border: `1px solid ${COLORS.neutro100}`, borderRadius: 8,
                fontSize: 14, color: COLORS.neutro900, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Encuestas disponibles
            </label>
            {/* Encuestas Emociones */}
            <select
              value={grupoForm.encuestaEmociones}
              onChange={event => setGrupoForm(prev => ({ ...prev, encuestaEmociones: event.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              >
                <option disabled value="">Selecciona encuesta de emociones...</option>
                {FORMULARIOS_DISPONIBLES.map((formulario) => (
                  formulario.categoria === "Emociones" && (
                    <option key={formulario.id} value={formulario.id}>
                      {formulario.nombre}
                    </option>
                  )
                ))}
            </select>

            {/* Encuesta Bienestar */}
            <select
              value={grupoForm.encuestaBienestar}
              onChange={event => setGrupoForm(prev => ({ ...prev, encuestaBienestar: event.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            >
              <option disabled value="">Selecciona encuesta de bienestar...</option>
              {FORMULARIOS_DISPONIBLES.map((formulario) => (
                formulario.categoria === "Bienestar" && (
                  <option key={formulario.id} value={formulario.id}>
                    {formulario.nombre}
                  </option>
                )
              ))}
            </select>

            {/* Encuesta Aprendizaje */}
            <select
              value={grupoForm.encuestaAprendizaje}
              onChange={event => setGrupoForm(prev => ({ ...prev, encuestaAprendizaje: event.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            >
              <option disabled value="">Selecciona encuesta de aprendizaje...</option>
              {FORMULARIOS_DISPONIBLES.map((formulario) => (
                formulario.categoria === "Aprendizaje" && (
                  <option key={formulario.id} value={formulario.id}>
                    {formulario.nombre} 
                  </option> 
                )
              ))}
            </select>
            
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Estado de los reportes
            </label>
            <select
              value={grupoForm.estadoReporte}
              onChange={event => setGrupoForm(prev => ({ ...prev, estadoReporte: event.target.value as "privado" | "publico" }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            >
              <option value="privado">Privado</option>
              <option value="publico">Público</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Reporte grupal
            </label>
            <input type="file" onChange={handleReporteUpload} style={{ width: "100%", fontSize: 13, color: COLORS.neutro700 }} />
            {grupoForm.reporteGrupal && (
              <div style={{ marginTop: 8, fontSize: 12, color: COLORS.verde600 }}>
                Archivo seleccionado: {grupoForm.reporteGrupal}
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, padding: 12, background: COLORS.neutro50 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.neutro900 }}>Alumnos</div>
                <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Agrega nombre y CURP de cada alumno.</div>
              </div>
              <button type="button" onClick={addAlumno} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${COLORS.violeta100}`, background: COLORS.violeta50, color: COLORS.violeta600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Añadir
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grupoForm.alumnos.map((alumno, index) => (
                <div key={alumno.id} style={{ display: "flex", flexDirection: "column", gap: 8, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.neutro900 }}>Alumno {index + 1}</div>
                    {grupoForm.alumnos.length > 1 && (
                      <button type="button" onClick={() => removeAlumno(index)} style={{ border: "none", background: "transparent", color: COLORS.neutro500, cursor: "pointer", fontSize: 14 }} aria-label="Eliminar alumno">
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                  <input
                    value={alumno.nombre}
                    onChange={event => updateAlumno(index, "nombre", event.target.value)}
                    placeholder="Nombre completo"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                  />
                  <input
                    value={alumno.curp}
                    onChange={event => updateAlumno(index, "curp", event.target.value)}
                    placeholder="CURP"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={() => setShowCrearGrupo(false)} style={{
              padding: "9px 18px", borderRadius: 8, fontSize: 14,
              background: "none", border: `1px solid ${COLORS.neutro100}`,
              color: COLORS.neutro700, cursor: "pointer",
            }}>
              Cancelar
            </button>
            <button type="submit" style={{
              padding: "9px 20px", borderRadius: 8, fontSize: 14,
              background: COLORS.violeta400, border: "none",
              color: "#fff", fontWeight: 500, cursor: "pointer",
            }}>
              {grupoEditandoId ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}