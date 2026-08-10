import React, { useState } from "react";
import COLORS from "@/utils/Colors";
import Reactivo from "./Reactivo";
import { databaseService, ApiError } from "@/services/databaseService";
import { CATEGORIA_LABELS } from "@/utils/categorias";
import type {
  CategoriaFormulario,
  EstudianteConEstado,
  EvaluacionConProgreso,
  GrupoConProgreso,
  Pregunta,
} from "@/utils/types";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
type Seccion =
  | "verificacion"
  | "seleccionarGrupo"
  | "seleccionarFormulario"
  | "seleccionarAlumno"
  | "confirmacion"
  | "respondiendo"
  | "completado";

interface FormularioDisponible {
  categoria: CategoriaFormulario;
  formularioId: string;
  titulo: string;
}

interface SesionActiva {
  sesionId: string;
  preguntas: Pregunta[];
}

// ─────────────────────────────────────────────
// Estilos compartidos
// ─────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  width: 380,
  overflow: "hidden",
};

const cardHeaderStyle: React.CSSProperties = {
  padding: "18px 24px 14px",
  borderBottom: `1px solid ${COLORS.neutro100}`,
};

const cardBodyStyle: React.CSSProperties = {
  padding: "20px 24px 24px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: COLORS.neutro500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: 6,
};

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid ${focused ? COLORS.violeta400 : COLORS.neutro100}`,
    borderRadius: 8,
    fontSize: 14,
    color: COLORS.neutro900,
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#fff",
    boxShadow: focused ? `0 0 0 3px ${COLORS.violeta50}` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
}

const CATEGORIA_COLOR: Record<CategoriaFormulario, { color: string; colorText: string }> = {
  emociones: { color: COLORS.violeta50, colorText: COLORS.violeta600 },
  bienestar_psicologico: { color: COLORS.verde50, colorText: COLORS.verde600 },
  aprendizaje: { color: COLORS.azul50, colorText: COLORS.azul600 },
};

function estadoPorCategoria(estudiante: EstudianteConEstado, categoria: CategoriaFormulario) {
  if (categoria === "emociones") return estudiante.estadoEmociones;
  if (categoria === "bienestar_psicologico") return estudiante.estadoBienestar;
  return estudiante.estadoAprendizaje;
}

function formulariosDelGrupo(grupo: GrupoConProgreso): FormularioDisponible[] {
  const posibles: Array<[CategoriaFormulario, string | null | undefined, string | null | undefined]> = [
    ["emociones", grupo.formEmocionesId, grupo.formEmocionesTitulo],
    ["bienestar_psicologico", grupo.formBienpsicId, grupo.formBienpsicTitulo],
    ["aprendizaje", grupo.formAprendizajeId, grupo.formAprendizajeTitulo],
  ];
  return posibles
    .filter((p): p is [CategoriaFormulario, string, string] => Boolean(p[1]))
    .map(([categoria, formularioId, titulo]) => ({ categoria, formularioId, titulo }));
}

function BtnPrimario({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "11px 20px", borderRadius: 8, border: "none",
      background: disabled ? COLORS.neutro100 : COLORS.violeta400,
      color: disabled ? COLORS.neutro400 : "#fff",
      fontSize: 14, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s",
    }}>
      {label}
    </button>
  );
}

function BtnSecundario({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "11px 20px", borderRadius: 8,
      border: `1.5px solid ${COLORS.neutro100}`,
      background: "#fff", color: COLORS.neutro700,
      fontSize: 14, fontWeight: 500, cursor: "pointer",
    }}>
      {label}
    </button>
  );
}

function LogoHeader({ escuela, grupo }: { escuela?: string; grupo?: string }) {
  return (
    <div style={cardHeaderStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: COLORS.violeta400,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: COLORS.verde400 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.neutro900 }}>{escuela ?? "PSYEVA"}</div>
          {grupo && <div style={{ fontSize: 11, color: COLORS.neutro500 }}>{grupo}</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 1 — Verificación de código
// ─────────────────────────────────────────────
function VerificacionStep({ onContinue }: {
  onContinue: (colegioNombre: string, evaluacion: EvaluacionConProgreso) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  const handleContinue = async () => {
    if (codigo.trim().length < 3) { setError("Ingresa un código válido."); return; }

    setVerificando(true);
    setError("");
    try {
      const { colegio, evaluaciones } = await databaseService.facilitador.verificar(codigo.trim());
      const activa = evaluaciones.find(e => e.aceptaRespuestas);
      if (!activa) {
        setError("Esta escuela no tiene una evaluación abierta en este momento.");
        return;
      }
      onContinue(colegio.nombre, activa);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar el código.");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div style={cardStyle}>
      <LogoHeader />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          Ingresa el código de tu escuela
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro500 }}>
          Tu facilitador te compartió este código para iniciar la evaluación.
        </p>
        <label style={labelStyle}>Código de acceso</label>
        <input
          type="text" placeholder="Ej. san-jose-2026" value={codigo}
          onChange={e => { setCodigo(e.target.value); setError(""); }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Enter" && handleContinue()}
          style={{ ...inputStyle(focused), fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: error ? 6 : 20 }}
          autoFocus
        />
        {error && <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.rojo400 }}>{error}</p>}
        <BtnPrimario label={verificando ? "Verificando..." : "Continuar"} onClick={handleContinue} disabled={verificando || codigo.trim().length === 0} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 2 — Seleccionar grupo
// ─────────────────────────────────────────────
function SeleccionarGrupoStep({ escuela, grupos, onBack, onContinue }: {
  escuela: string; grupos: GrupoConProgreso[]; onBack: () => void; onContinue: (grupo: GrupoConProgreso) => void;
}) {
  return (
    <div style={{ ...cardStyle, width: 420 }}>
      <LogoHeader escuela={escuela} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          Selecciona el grupo
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.neutro500 }}>
          Toca el grupo que va a realizar la evaluación hoy.
        </p>

        {grupos.length === 0 ? (
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro400, textAlign: "center" }}>
            Esta evaluación todavía no tiene grupos configurados.
          </p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}>
            {grupos.map(g => (
              <button
                key={g.grupoId}
                onClick={() => onContinue(g)}
                style={{
                  padding: "18px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${COLORS.neutro100}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.neutro900,
                  textAlign: "center" as const,
                  transition: "border-color 0.15s, background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = COLORS.violeta400;
                  el.style.background = COLORS.violeta50;
                  el.style.color = COLORS.violeta600;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = COLORS.neutro100;
                  el.style.background = "#fff";
                  el.style.color = COLORS.neutro900;
                }}
              >
                {g.grupoNombre}
              </button>
            ))}
          </div>
        )}

        <BtnSecundario label="Atrás" onClick={onBack} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 3 — Tipo de formulario
// ─────────────────────────────────────────────
function SeleccionarFormularioStep({ escuela, grupo, onBack, onContinue }: {
  escuela: string; grupo: GrupoConProgreso; onBack: () => void; onContinue: (formulario: FormularioDisponible) => void;
}) {
  const disponibles = formulariosDelGrupo(grupo);

  return (
    <div style={cardStyle}>
      <LogoHeader escuela={escuela} grupo={grupo.grupoNombre} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          ¿Qué tipo de evaluación?
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.neutro500 }}>
          Toca el formulario que van a responder hoy.
        </p>

        {disponibles.length === 0 ? (
          <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro400, textAlign: "center" }}>
            Este grupo no tiene encuestas asignadas todavía.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {disponibles.map(formulario => {
              const meta = CATEGORIA_COLOR[formulario.categoria];
              return (
                <button
                  key={formulario.formularioId}
                  onClick={() => onContinue(formulario)}
                  style={{
                    width: "100%", padding: "18px 20px", borderRadius: 12,
                    border: `1.5px solid ${COLORS.neutro100}`,
                    background: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14,
                    textAlign: "left" as const,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = meta.colorText;
                    el.style.background = meta.color;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = COLORS.neutro100;
                    el.style.background = "#fff";
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: meta.color, border: `1.5px solid ${meta.colorText}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: meta.colorText, opacity: 0.7 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {CATEGORIA_LABELS[formulario.categoria]}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>{formulario.titulo}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke={COLORS.neutro400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <BtnSecundario label="Atrás" onClick={onBack} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 4 — Seleccionar alumno
// ─────────────────────────────────────────────
function SeleccionarAlumnoStep({ escuela, grupo, formulario, estudiantes, onBack, onContinue }: {
  escuela: string; grupo: GrupoConProgreso; formulario: FormularioDisponible; estudiantes: EstudianteConEstado[];
  onBack: () => void; onContinue: (alumno: EstudianteConEstado) => void;
}) {
  const [alumnoSel, setAlumnoSel] = useState<EstudianteConEstado | null>(null);
  const pendientes = estudiantes.filter(e => estadoPorCategoria(e, formulario.categoria) !== "completada");

  return (
    <div style={{ ...cardStyle, width: 420 }}>
      <LogoHeader escuela={escuela} grupo={`${grupo.grupoNombre} · ${CATEGORIA_LABELS[formulario.categoria]}`} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          ¿Quién va a responder?
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.neutro500 }}>
          {pendientes.length} alumnos pendientes · toca un nombre para seleccionar.
        </p>

        <div style={{
          border: `1px solid ${COLORS.neutro100}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 18,
          maxHeight: 340,
          overflowY: "auto",
        }}>
          {pendientes.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center" as const, fontSize: 14, color: COLORS.neutro400 }}>
              Todos los alumnos han completado esta encuesta ✓
            </div>
          ) : pendientes.map((a, idx) => {
            const sel = alumnoSel?.estudianteId === a.estudianteId;
            return (
              <div
                key={a.estudianteId}
                onClick={() => setAlumnoSel(sel ? null : a)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 16px",
                  borderBottom: idx < pendientes.length - 1 ? `1px solid ${COLORS.neutro50}` : "none",
                  background: sel ? COLORS.violeta50 : "#fff",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = COLORS.neutro50; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = "#fff"; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: sel ? COLORS.violeta400 : COLORS.neutro100,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600,
                  color: sel ? "#fff" : COLORS.neutro500,
                  transition: "all 0.15s",
                }}>
                  {a.nombreCompleto.charAt(0)}
                </div>

                <span style={{
                  fontSize: 14, flex: 1,
                  color: sel ? COLORS.violeta700 : COLORS.neutro900,
                  fontWeight: sel ? 600 : 400,
                }}>
                  {a.nombreCompleto}
                </span>

                {sel && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="10" fill={COLORS.violeta400} />
                    <path d="M5.5 10L8.5 13L14.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <BtnSecundario label="Atrás" onClick={onBack} />
          <div style={{ flex: 1 }}>
            <BtnPrimario
              label="Iniciar evaluación"
              onClick={() => alumnoSel && onContinue(alumnoSel)}
              disabled={!alumnoSel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pantalla de confirmación antes de empezar
// ─────────────────────────────────────────────
function ConfirmacionStep({ alumno, formulario, iniciando, onIniciar }: {
  alumno: EstudianteConEstado; formulario: FormularioDisponible; iniciando: boolean; onIniciar: () => void;
}) {
  return (
    <div style={{ ...cardStyle, width: 380 }}>
      <LogoHeader escuela={formulario.titulo} />
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "36px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: COLORS.neutro900 }}>
          ¡Listo, {alumno.nombreCompleto.split(" ")[0]}!
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: COLORS.neutro500 }}>
          Vas a responder la evaluación de <strong>{CATEGORIA_LABELS[formulario.categoria]}</strong>.<br />
          Toca "Comenzar" cuando estés listo.
        </p>
        <BtnPrimario label={iniciando ? "Cargando..." : "Comenzar evaluación"} onClick={onIniciar} disabled={iniciando} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pantalla final
// ─────────────────────────────────────────────
function CompletadoStep({ alumno, onSiguienteAlumno }: { alumno: EstudianteConEstado; onSiguienteAlumno: () => void }) {
  return (
    <div style={{ ...cardStyle, width: 380 }}>
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: COLORS.neutro900 }}>
          ¡Gracias, {alumno.nombreCompleto.split(" ")[0]}!
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: COLORS.neutro500 }}>
          Tus respuestas fueron guardadas correctamente.
        </p>
        <BtnPrimario label="Siguiente alumno" onClick={onSiguienteAlumno} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function Encuesta() {
  const [seccion, setSeccion] = useState<Seccion>("verificacion");
  const [escuela, setEscuela] = useState("");
  const [evaluacionActiva, setEvaluacionActiva] = useState<EvaluacionConProgreso | null>(null);
  const [grupos, setGrupos] = useState<GrupoConProgreso[]>([]);
  const [grupo, setGrupo] = useState<GrupoConProgreso | null>(null);
  const [formulario, setFormulario] = useState<FormularioDisponible | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteConEstado[]>([]);
  const [alumno, setAlumno] = useState<EstudianteConEstado | null>(null);

  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [indexActual, setIndexActual] = useState(0);
  const [respuestasLocal, setRespuestasLocal] = useState<Record<string, number>>({});
  const [iniciando, setIniciando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pasoError, setPasoError] = useState<string | null>(null);

  const PASOS: Seccion[] = ["verificacion", "seleccionarGrupo", "seleccionarFormulario", "seleccionarAlumno"];
  const pasoActual = PASOS.indexOf(seccion);

  const reiniciar = () => {
    setSeccion("verificacion");
    setEscuela(""); setEvaluacionActiva(null); setGrupos([]);
    setGrupo(null); setFormulario(null); setEstudiantes([]); setAlumno(null);
    setSesion(null); setIndexActual(0); setRespuestasLocal({});
  };

  const handleVerificado = async (colegioNombre: string, evaluacion: EvaluacionConProgreso) => {
    setEscuela(colegioNombre);
    setEvaluacionActiva(evaluacion);
    setPasoError(null);
    try {
      const { grupos } = await databaseService.facilitador.listarGrupos(evaluacion.evaluacionId);
      setGrupos(grupos);
      setSeccion("seleccionarGrupo");
    } catch (err) {
      setPasoError(err instanceof ApiError ? err.message : "No se pudieron cargar los grupos");
    }
  };

  const handleSeleccionarGrupo = (g: GrupoConProgreso) => {
    setGrupo(g);
    setSeccion("seleccionarFormulario");
  };

  const handleSeleccionarFormulario = async (f: FormularioDisponible) => {
    if (!grupo || !evaluacionActiva) return;
    setFormulario(f);
    setPasoError(null);
    try {
      const { estudiantes } = await databaseService.facilitador.listarEstudiantes(grupo.grupoId, evaluacionActiva.evaluacionId);
      setEstudiantes(estudiantes);
      setSeccion("seleccionarAlumno");
    } catch (err) {
      setPasoError(err instanceof ApiError ? err.message : "No se pudieron cargar los estudiantes");
    }
  };

  const handleSeleccionarAlumno = (a: EstudianteConEstado) => {
    setAlumno(a);
    setSeccion("confirmacion");
  };

  const handleIniciar = async () => {
    if (!alumno || !formulario || !evaluacionActiva) return;
    setIniciando(true);
    try {
      const { sesion: sesionResult, preguntas } = await databaseService.facilitador.iniciarSesion({
        estudianteId: alumno.estudianteId,
        formularioId: formulario.formularioId,
        evaluacionId: evaluacionActiva.evaluacionId,
      });

      // Retoma una sesión ya empezada: precarga las respuestas guardadas
      // y salta a la primera pregunta que todavía falta.
      const respuestasPrevias: Record<string, number> = {};
      preguntas.forEach(p => {
        if (p.textoLibre) {
          const opcion = p.opcionesRespuesta.find(o => o.texto === p.textoLibre);
          if (opcion) respuestasPrevias[p.id] = opcion.valor;
        }
      });
      const primerPendiente = preguntas.findIndex(p => !p.textoLibre);

      setSesion({ sesionId: sesionResult.sesionId, preguntas });
      setRespuestasLocal(respuestasPrevias);
      setIndexActual(primerPendiente === -1 ? 0 : primerPendiente);
      setSeccion("respondiendo");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo iniciar la evaluación");
    } finally {
      setIniciando(false);
    }
  };

  const handleSiguiente = async () => {
    if (!sesion) return;
    const pregunta = sesion.preguntas[indexActual];
    if (!pregunta) return;
    const valor = respuestasLocal[pregunta.id];
    const opcion = pregunta.opcionesRespuesta.find(o => o.valor === valor);
    if (!opcion) return;

    setEnviando(true);
    try {
      await databaseService.facilitador.guardarRespuesta({
        sesionId: sesion.sesionId,
        preguntaId: pregunta.id,
        textoLibre: opcion.texto,
      });

      const esUltima = indexActual === sesion.preguntas.length - 1;
      if (!esUltima) {
        setIndexActual(i => i + 1);
        return;
      }

      try {
        await databaseService.facilitador.completarSesion(sesion.sesionId);
        setSeccion("completado");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          alert("Faltan preguntas por responder antes de terminar.");
        } else {
          alert(err instanceof ApiError ? err.message : "No se pudo completar la evaluación");
        }
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar la respuesta");
    } finally {
      setEnviando(false);
    }
  };

  const preguntaActual = sesion?.preguntas[indexActual];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "24px",
      background: `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 60%, ${COLORS.azul50} 100%)`,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {(seccion === "verificacion" || seccion === "seleccionarGrupo" || seccion === "seleccionarFormulario" || seccion === "seleccionarAlumno") && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          {PASOS.map((s, i) => {
            const activo = s === seccion;
            const completado = PASOS.indexOf(s) < pasoActual;
            return (
              <React.Fragment key={s}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: completado ? COLORS.verde400 : activo ? COLORS.violeta400 : COLORS.neutro100,
                  color: completado || activo ? "#fff" : COLORS.neutro400,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                }}>
                  {completado
                    ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : i + 1}
                </div>
                {i < PASOS.length - 1 && (
                  <div style={{ width: 28, height: 2, borderRadius: 2, background: completado ? COLORS.verde400 : COLORS.neutro100, transition: "background 0.2s" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {pasoError && (
        <p style={{ marginBottom: 12, fontSize: 13, color: COLORS.rojo400, textAlign: "center" }}>{pasoError}</p>
      )}

      {seccion === "verificacion" && (
        <VerificacionStep onContinue={handleVerificado} />
      )}
      {seccion === "seleccionarGrupo" && (
        <SeleccionarGrupoStep escuela={escuela} grupos={grupos} onBack={reiniciar} onContinue={handleSeleccionarGrupo} />
      )}
      {seccion === "seleccionarFormulario" && grupo && (
        <SeleccionarFormularioStep escuela={escuela} grupo={grupo} onBack={() => setSeccion("seleccionarGrupo")} onContinue={handleSeleccionarFormulario} />
      )}
      {seccion === "seleccionarAlumno" && grupo && formulario && (
        <SeleccionarAlumnoStep
          escuela={escuela} grupo={grupo} formulario={formulario} estudiantes={estudiantes}
          onBack={() => setSeccion("seleccionarFormulario")}
          onContinue={handleSeleccionarAlumno}
        />
      )}
      {seccion === "confirmacion" && alumno && formulario && (
        <ConfirmacionStep alumno={alumno} formulario={formulario} iniciando={iniciando} onIniciar={handleIniciar} />
      )}
      {seccion === "respondiendo" && sesion && preguntaActual && alumno && (
        <div style={{ width: "100%" }}>
          <Reactivo
            pregunta={preguntaActual.texto}
            imagenUrl={preguntaActual.imagenUrl ?? undefined}
            opciones={preguntaActual.opcionesRespuesta.map(o => ({ label: o.texto, value: o.valor }))}
            numeroPregunta={indexActual + 1}
            totalPreguntas={sesion.preguntas.length}
            nombreEstudiante={alumno.nombreCompleto}
            valorSeleccionado={respuestasLocal[preguntaActual.id] ?? null}
            onSeleccionar={valor => setRespuestasLocal(prev => ({ ...prev, [preguntaActual.id]: valor }))}
            onAnterior={indexActual > 0 ? () => setIndexActual(i => i - 1) : undefined}
            onSiguiente={enviando ? undefined : handleSiguiente}
            esUltima={indexActual === sesion.preguntas.length - 1}
          />
        </div>
      )}
      {seccion === "completado" && alumno && (
        <CompletadoStep alumno={alumno} onSiguienteAlumno={() => {
          setSesion(null); setIndexActual(0); setRespuestasLocal({}); setAlumno(null);
          setSeccion("seleccionarAlumno");
          // refresca la lista de pendientes para que ya no aparezca este alumno
          if (grupo && evaluacionActiva) {
            databaseService.facilitador.listarEstudiantes(grupo.grupoId, evaluacionActiva.evaluacionId)
              .then(({ estudiantes }) => setEstudiantes(estudiantes))
              .catch(() => {});
          }
        }} />
      )}
    </div>
  );
}
