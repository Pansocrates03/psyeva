import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import Drawer from "../components/Drawer";
import COLORS from "../utils/Colors";
import DetalleAnalisisGrupos, { type Grupo as GrupoCardData } from "@/components/layouts/DetalleAnalisisGrupos";
import DetalleAnalisisEstudiantes, { type EstudianteTablaRow } from "@/components/layouts/DetalleAnalisisEstudiantes";
import DetalleAnalisisDatos from "@/components/layouts/DetalleAnalisisDatos";
import { databaseService, ApiError } from "../services/databaseService";
import { CATEGORIA_LABELS, CATEGORIAS } from "../utils/categorias";
import type {
  EvaluacionConProgreso,
  EstudianteConEstado,
  FormularioConTotalPreguntas,
  GrupoConProgreso,
  GrupoRespuestas,
  Reporte,
} from "../utils/types";

// ── Tipos locales del formulario de grupo ───────────────────────
interface AlumnoFormRow {
  id: number;
  nombreCompleto: string;
  curp: string;
}

interface GrupoFormState {
  nombre: string;
  formEmocionesId: string;
  formBienpsicId: string;
  formAprendizajeId: string;
  alumnosNuevos: AlumnoFormRow[];
}

const createAlumnoRow = (): AlumnoFormRow => ({ id: Date.now() + Math.random(), nombreCompleto: "", curp: "" });
const emptyGrupoForm = (): GrupoFormState => ({
  nombre: "", formEmocionesId: "", formBienpsicId: "", formAprendizajeId: "", alumnosNuevos: [createAlumnoRow()],
});

// ── Adaptadores de datos reales → props de los sub-componentes ──
const ESTADO_GRUPO_MAP: Record<string, "completo" | "en_progreso" | "sin_iniciar"> = {
  completo: "completo",
  en_progreso: "en_progreso",
  pendiente: "sin_iniciar",
  sin_alumnos: "sin_iniciar",
};

function mapGrupoParaCard(g: GrupoConProgreso): GrupoCardData {
  const formularios = [
    g.formEmocionesTitulo ? CATEGORIA_LABELS.emociones : null,
    g.formBienpsicTitulo ? CATEGORIA_LABELS.bienestar_psicologico : null,
    g.formAprendizajeTitulo ? CATEGORIA_LABELS.aprendizaje : null,
  ].filter((v): v is string => v !== null);

  return {
    id: g.grupoId,
    nombre: g.grupoNombre,
    estado: ESTADO_GRUPO_MAP[g.estadoGrupo] ?? "sin_iniciar",
    sesionesCompletadas: Number(g.sesionesCompletadas),
    sesionesPosibles: Number(g.totalAlumnos) * 3,
    reportesPublicados: Number(g.reportesIndividuales),
    totalReportes: Number(g.totalAlumnos),
    reporteGrupal: Number(g.reporteGrupal) > 0,
    formularios,
  };
}

function formatFecha(fecha: string) {
  // Postgres serializa DATE como ISO datetime completo en UTC medianoche
  // (...T00:00:00.000Z). Hay que formatear en UTC también, si no el
  // navegador la corre un día para atrás en timezones negativos.
  const iso = fecha.includes("T") ? fecha : `${fecha}T00:00:00Z`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

type EstadoEvaluacionUI = "configuracion" | "aceptando" | "publicada";

function estadoEvaluacionUI(evaluacion: EvaluacionConProgreso): EstadoEvaluacionUI {
  if (evaluacion.reportesPublicados) return "publicada";
  if (evaluacion.aceptaRespuestas) return "aceptando";
  return "configuracion";
}

const ESTADO_UI_LABELS: Record<EstadoEvaluacionUI, string> = {
  configuracion: "Configurando",
  aceptando: "Aceptando respuestas",
  publicada: "Reportes publicados",
};

// ── Página principal ──────────────────────────────────────────
export default function DetalleAnalisis() {
  const { id: evaluacionId } = useParams<{ id: string }>();

  const [evaluacion, setEvaluacion] = useState<EvaluacionConProgreso | null>(null);
  const [grupos, setGrupos] = useState<GrupoConProgreso[]>([]);
  const [loadingEvaluacion, setLoadingEvaluacion] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layout, setLayout] = useState<"grupos" | "estudiantes" | "datos">("grupos");

  const [estudiantesTabla, setEstudiantesTabla] = useState<EstudianteTablaRow[] | null>(null);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);

  const [datosRespuestas, setDatosRespuestas] = useState<{
    preguntas: GrupoRespuestas["preguntas"];
    estudiantes: Array<GrupoRespuestas["estudiantes"][number] & { grupoNombre: string }>;
  } | null>(null);
  const [loadingDatos, setLoadingDatos] = useState(false);

  const [showCrearGrupo, setShowCrearGrupo] = useState(false);
  const [grupoEditandoId, setGrupoEditandoId] = useState<string | null>(null);
  const [grupoEditandoEstudiantes, setGrupoEditandoEstudiantes] = useState<EstudianteConEstado[]>([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [grupoForm, setGrupoForm] = useState<GrupoFormState>(emptyGrupoForm());
  const [formularios, setFormularios] = useState<FormularioConTotalPreguntas[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarEvaluacion = () => {
    if (!evaluacionId) return;
    setLoadingEvaluacion(true);
    setError(null);
    databaseService.admin.obtenerEvaluacion(evaluacionId)
      .then(data => {
        setEvaluacion(data);
        setGrupos(data.grupos);
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudo cargar la evaluación"))
      .finally(() => setLoadingEvaluacion(false));
  };

  useEffect(cargarEvaluacion, [evaluacionId]);

  // Invalida la caché de las pestañas "estudiantes"/"datos" cuando cambian los grupos
  const invalidarTabs = () => {
    setEstudiantesTabla(null);
    setDatosRespuestas(null);
  };

  const cargarEstudiantesTabla = async () => {
    if (!evaluacionId) return;
    setLoadingEstudiantes(true);
    try {
      const [detalles, reportes] = await Promise.all([
        Promise.all(grupos.map(g => databaseService.admin.obtenerGrupo(g.grupoId))),
        databaseService.admin.listarReportes({ evaluacionId, tipo: "individual" }),
      ]);
      const reportePorEstudiante = new Map<string, Reporte>(reportes.map(r => [r.estudianteId ?? "", r]));

      const filas: EstudianteTablaRow[] = detalles.flatMap(g =>
        g.estudiantes.map(e => ({
          estudianteId: e.estudianteId,
          nombreCompleto: e.nombreCompleto,
          curp: e.curp,
          grupoId: g.grupoId,
          grupoNombre: g.grupoNombre,
          todoCompletado: e.todoCompletado,
          archivoReporte: reportePorEstudiante.get(e.estudianteId)?.archivoUrl ?? null,
        }))
      );
      setEstudiantesTabla(filas);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los estudiantes");
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const cargarDatos = async () => {
    setLoadingDatos(true);
    try {
      const porGrupo = await Promise.all(grupos.map(g => databaseService.admin.obtenerRespuestasGrupo(g.grupoId)));

      const preguntasPorId = new Map<string, GrupoRespuestas["preguntas"][number]>();
      const estudiantes: Array<GrupoRespuestas["estudiantes"][number] & { grupoNombre: string }> = [];

      porGrupo.forEach((data, index) => {
        data.preguntas.forEach(p => preguntasPorId.set(p.id, p));
        const grupoNombre = grupos[index]?.grupoNombre ?? "";
        estudiantes.push(...data.estudiantes.map(e => ({ ...e, grupoNombre })));
      });

      setDatosRespuestas({ preguntas: Array.from(preguntasPorId.values()), estudiantes });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las respuestas");
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    if (!evaluacion) return;
    if (layout === "estudiantes" && estudiantesTabla === null && !loadingEstudiantes) cargarEstudiantesTabla();
    if (layout === "datos" && datosRespuestas === null && !loadingDatos) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, evaluacion]);

  const totalAlumnos = grupos.reduce((s, g) => s + Number(g.totalAlumnos), 0);
  const totalReportes = grupos.reduce((s, g) => s + Number(g.reportesIndividuales), 0);
  const porcentajeCompletado = totalAlumnos > 0
    ? Math.round((grupos.reduce((s, g) => s + Number(g.sesionesCompletadas), 0) / (totalAlumnos * 3)) * 100)
    : 0;

  const gruposCard = useMemo(() => grupos.map(mapGrupoParaCard), [grupos]);

  // ── Fase de la evaluación ─────────────────────────────────────
  const cambiarFase = async (campo: "aceptaRespuestas" | "reportesPublicados", valor: boolean) => {
    if (!evaluacionId) return;
    try {
      await databaseService.admin.cambiarEstadoEvaluacion(evaluacionId, campo, valor);
      cargarEvaluacion();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cambiar el estado de la evaluación");
    }
  };

  // ── Drawer crear/editar grupo ────────────────────────────────
  const asegurarFormularios = () => {
    if (formularios.length > 0) return;
    databaseService.admin.listarFormularios().then(setFormularios).catch(() => {});
  };

  const abrirDrawerCrear = () => {
    setGrupoEditandoId(null);
    setGrupoEditandoEstudiantes([]);
    setGrupoForm(emptyGrupoForm());
    setFormError(null);
    asegurarFormularios();
    setShowCrearGrupo(true);
  };

  const abrirDrawerEditar = async (grupo: GrupoCardData) => {
    setGrupoEditandoId(grupo.id);
    setFormError(null);
    asegurarFormularios();
    setShowCrearGrupo(true);
    setLoadingDrawer(true);
    try {
      const detalle = await databaseService.admin.obtenerGrupo(grupo.id);
      setGrupoForm({
        nombre: detalle.grupoNombre,
        formEmocionesId: detalle.formEmocionesId ?? "",
        formBienpsicId: detalle.formBienpsicId ?? "",
        formAprendizajeId: detalle.formAprendizajeId ?? "",
        alumnosNuevos: [createAlumnoRow()],
      });
      setGrupoEditandoEstudiantes(detalle.estudiantes);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo cargar el grupo");
    } finally {
      setLoadingDrawer(false);
    }
  };

  const cerrarDrawer = () => {
    setShowCrearGrupo(false);
    setGrupoEditandoId(null);
    setGrupoEditandoEstudiantes([]);
    setGrupoForm(emptyGrupoForm());
  };

  const updateAlumno = (index: number, field: "nombreCompleto" | "curp", value: string) => {
    setGrupoForm(prev => ({
      ...prev,
      alumnosNuevos: prev.alumnosNuevos.map((a, i) => i === index ? { ...a, [field]: value } : a),
    }));
  };
  const addAlumnoRow = () => setGrupoForm(prev => ({ ...prev, alumnosNuevos: [...prev.alumnosNuevos, createAlumnoRow()] }));
  const removeAlumnoRow = (index: number) => setGrupoForm(prev => ({
    ...prev, alumnosNuevos: prev.alumnosNuevos.filter((_, i) => i !== index),
  }));

  const handleGuardarGrupo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!evaluacionId || !grupoForm.nombre.trim()) {
      setFormError("El nombre del grupo es requerido.");
      return;
    }

    const nuevosAlumnos = grupoForm.alumnosNuevos
      .filter(a => a.nombreCompleto.trim())
      .map(a => ({ nombreCompleto: a.nombreCompleto.trim(), curp: a.curp.trim() || undefined }));

    setSaving(true);
    setFormError(null);
    try {
      const cambiosGrupo = {
        nombre: grupoForm.nombre.trim(),
        formEmocionesId: grupoForm.formEmocionesId || undefined,
        formBienpsicId: grupoForm.formBienpsicId || undefined,
        formAprendizajeId: grupoForm.formAprendizajeId || undefined,
      };

      if (grupoEditandoId) {
        await databaseService.admin.actualizarGrupo(grupoEditandoId, cambiosGrupo);
        for (const alumno of nuevosAlumnos) {
          await databaseService.admin.agregarEstudiante(grupoEditandoId, alumno);
        }
      } else {
        await databaseService.admin.crearGrupo({ evaluacionId, ...cambiosGrupo, estudiantes: nuevosAlumnos });
      }

      cerrarDrawer();
      cargarEvaluacion();
      invalidarTabs();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar el grupo");
    } finally {
      setSaving(false);
    }
  };

  const eliminarGrupoActual = async () => {
    if (!grupoEditandoId) return;
    if (!confirm("¿Eliminar este grupo? Esta acción no se puede deshacer.")) return;
    try {
      await databaseService.admin.eliminarGrupo(grupoEditandoId);
      cerrarDrawer();
      cargarEvaluacion();
      invalidarTabs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar el grupo");
    }
  };

  const eliminarEstudianteExistente = async (estudianteId: string) => {
    if (!confirm("¿Quitar a este estudiante del grupo?")) return;
    try {
      await databaseService.admin.eliminarEstudiante(estudianteId);
      setGrupoEditandoEstudiantes(prev => prev.filter(e => e.estudianteId !== estudianteId));
      invalidarTabs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo quitar al estudiante");
    }
  };

  // ── Reportes ─────────────────────────────────────────────────
  const handleUploadReporteEstudiante = async (grupoId: string, estudianteId: string, event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !evaluacionId) return;
    try {
      await databaseService.admin.subirReporte({ archivo, tipo: "individual", evaluacionId, estudianteId });
      cargarEvaluacion();
      setEstudiantesTabla(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir el reporte");
    } finally {
      event.target.value = "";
    }
  };

  const handleUploadReporteGrupal = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !evaluacionId || !grupoEditandoId) return;
    try {
      await databaseService.admin.subirReporte({ archivo, tipo: "grupal", evaluacionId, grupoId: grupoEditandoId });
      cargarEvaluacion();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir el reporte grupal");
    } finally {
      event.target.value = "";
    }
  };

  const handleExportar = async () => {
    if (!evaluacionId) return;
    try {
      const { blob, filename } = await databaseService.admin.exportarEvaluacion(evaluacionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo exportar la evaluación");
    }
  };

  if (loadingEvaluacion) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 40, color: COLORS.neutro500 }}>Cargando evaluación...</main>
      </div>
    );
  }

  if (error || !evaluacion) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 40, color: COLORS.rojo600 }}>{error ?? "Evaluación no encontrada"}</main>
      </div>
    );
  }

  const estado = estadoEvaluacionUI(evaluacion);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Análisis · {evaluacion.colegioNombre}
            </p>
            <h1 style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 600, color: COLORS.neutro900 }}>
              {evaluacion.nombre}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.neutro500 }}>
              {formatFecha(evaluacion.fecha)}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: estado === "publicada" ? COLORS.verde50 : estado === "aceptando" ? COLORS.violeta50 : COLORS.neutro100,
              color: estado === "publicada" ? COLORS.verde600 : estado === "aceptando" ? COLORS.violeta600 : COLORS.neutro700,
            }}>
              {ESTADO_UI_LABELS[estado]}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {estado !== "aceptando" && (
                <button onClick={() => cambiarFase("aceptaRespuestas", true)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, background: "#fff", color: COLORS.neutro700, fontSize: 12, cursor: "pointer" }}>
                  Abrir para respuestas
                </button>
              )}
              {estado === "aceptando" && (
                <button onClick={() => cambiarFase("aceptaRespuestas", false)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, background: "#fff", color: COLORS.neutro700, fontSize: 12, cursor: "pointer" }}>
                  Cerrar evaluación
                </button>
              )}
              {estado === "configuracion" && (
                <button onClick={() => cambiarFase("reportesPublicados", true)} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: COLORS.verde400, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Publicar reportes
                </button>
              )}
              {estado === "publicada" && (
                <button onClick={() => cambiarFase("reportesPublicados", false)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, background: "#fff", color: COLORS.neutro700, fontSize: 12, cursor: "pointer" }}>
                  Despublicar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Grupos" value={grupos.length} active={layout === "grupos"} onClick={() => setLayout("grupos")} />
          <StatCard label="Estudiantes" value={totalAlumnos} active={layout === "estudiantes"} onClick={() => setLayout("estudiantes")} />
          <StatCard label="Datos" value={porcentajeCompletado + "%"} active={layout === "datos"} sub="de las sesiones posibles completadas" onClick={() => setLayout("datos")} />
        </div>

        {/* Layout principal */}
        {layout === "grupos" ? (
          <DetalleAnalisisGrupos
            grupos={gruposCard}
            onSelectGrupo={grupo => abrirDrawerEditar(grupo)}
            onCreateGrupo={abrirDrawerCrear}
          />
        ) : layout === "estudiantes" ? (
          <DetalleAnalisisEstudiantes
            estudiantes={estudiantesTabla ?? []}
            loading={loadingEstudiantes}
            onClose={() => setLayout("grupos")}
            onUploadReporte={handleUploadReporteEstudiante}
          />
        ) : (
          <DetalleAnalisisDatos
            preguntas={datosRespuestas?.preguntas ?? []}
            estudiantes={datosRespuestas?.estudiantes ?? []}
            loading={loadingDatos}
            onExportar={handleExportar}
            onClose={() => setLayout("grupos")}
          />
        )}
      </main>

      <Drawer open={showCrearGrupo} onClose={cerrarDrawer} title={grupoEditandoId ? "Editar grupo" : "Crear grupo"}>
        {loadingDrawer ? (
          <p style={{ fontSize: 14, color: COLORS.neutro500 }}>Cargando grupo...</p>
        ) : (
        <form onSubmit={handleGuardarGrupo} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
              Nombre del grupo
            </label>
            <input
              value={grupoForm.nombre}
              onChange={event => setGrupoForm(prev => ({ ...prev, nombre: event.target.value }))}
              type="text"
              placeholder="Ej. 1ro A"
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700 }}>
              Formularios asignados
            </label>
            {([
              ["emociones", "formEmocionesId"],
              ["bienestar_psicologico", "formBienpsicId"],
              ["aprendizaje", "formAprendizajeId"],
            ] as const).map(([categoria, campo]) => (
              <select
                key={campo}
                value={grupoForm[campo]}
                onChange={event => setGrupoForm(prev => ({ ...prev, [campo]: event.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              >
                <option value="">Sin formulario de {CATEGORIA_LABELS[categoria]}</option>
                {formularios.filter(f => f.categoria === categoria).map(f => (
                  <option key={f.id} value={f.id}>{f.titulo}</option>
                ))}
              </select>
            ))}
          </div>

          {grupoEditandoId && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
                Reporte grupal
              </label>
              <input type="file" accept="application/pdf" onChange={handleUploadReporteGrupal} style={{ width: "100%", fontSize: 13, color: COLORS.neutro700 }} />
            </div>
          )}

          {grupoEditandoId && grupoEditandoEstudiantes.length > 0 && (
            <div style={{ border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, padding: 12, background: COLORS.neutro50 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.neutro900, marginBottom: 8 }}>
                Alumnos actuales ({grupoEditandoEstudiantes.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {grupoEditandoEstudiantes.map(estudiante => (
                  <div key={estudiante.estudianteId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, padding: "6px 10px" }}>
                    <span style={{ fontSize: 13, color: COLORS.neutro900 }}>{estudiante.nombreCompleto}</span>
                    <button type="button" onClick={() => eliminarEstudianteExistente(estudiante.estudianteId)} style={{ border: "none", background: "transparent", color: COLORS.rojo600, cursor: "pointer", fontSize: 12 }}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, padding: 12, background: COLORS.neutro50 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.neutro900 }}>
                  {grupoEditandoId ? "Agregar alumnos nuevos" : "Alumnos"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Agrega nombre y CURP de cada alumno.</div>
              </div>
              <button type="button" onClick={addAlumnoRow} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${COLORS.violeta100}`, background: COLORS.violeta50, color: COLORS.violeta600, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Añadir
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grupoForm.alumnosNuevos.map((alumno, index) => (
                <div key={alumno.id} style={{ display: "flex", flexDirection: "column", gap: 8, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.neutro900 }}>Alumno {index + 1}</div>
                    {grupoForm.alumnosNuevos.length > 1 && (
                      <button type="button" onClick={() => removeAlumnoRow(index)} style={{ border: "none", background: "transparent", color: COLORS.neutro500, cursor: "pointer", fontSize: 14 }} aria-label="Eliminar alumno">
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                  <input
                    value={alumno.nombreCompleto}
                    onChange={event => updateAlumno(index, "nombreCompleto", event.target.value)}
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

          {formError && <p style={{ margin: 0, fontSize: 13, color: COLORS.rojo600 }}>{formError}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingTop: 4 }}>
            {grupoEditandoId ? (
              <button type="button" onClick={eliminarGrupoActual} style={{
                padding: "9px 14px", borderRadius: 8, fontSize: 13,
                background: "none", border: "1px solid #FFC9C9",
                color: COLORS.rojo600, cursor: "pointer",
              }}>
                Eliminar grupo
              </button>
            ) : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={cerrarDrawer} style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 14,
                background: "none", border: `1px solid ${COLORS.neutro100}`,
                color: COLORS.neutro700, cursor: "pointer",
              }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{
                padding: "9px 20px", borderRadius: 8, fontSize: 14,
                background: COLORS.violeta400, border: "none",
                color: "#fff", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              }}>
                {saving ? "Guardando..." : grupoEditandoId ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </form>
        )}
      </Drawer>
    </div>
  );
}
