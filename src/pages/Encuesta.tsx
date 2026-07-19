import React, { useState } from "react";
import COLORS from "@/utils/Colors";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
type Seccion =
  | "verificacion"
  | "seleccionarGrupo"
  | "seleccionarEvaluacion"
  | "seleccionarAlumno"
  | "encuesta";

interface Alumno {
  id: number;
  nombre: string;
  completado: boolean;
}

interface TipoEvaluacion {
  id: number;
  label: string;
  color: string;
  colorText: string;
}

// ─────────────────────────────────────────────
// Datos de muestra
// ─────────────────────────────────────────────
const GRUPOS = ["1ro A", "1ro B", "1ro C", "2do A", "2do B", "3ro A", "3ro B", "4to A"];

const TIPOS_EVALUACION: TipoEvaluacion[] = [
  { id: 1, label: "Emociones",   color: COLORS.violeta50,  colorText: COLORS.violeta600 },
  { id: 2, label: "Bienestar",   color: COLORS.verde50,    colorText: COLORS.verde600   },
  { id: 3, label: "Aprendizaje", color: COLORS.azul50,     colorText: COLORS.azul600    },
];

const ALUMNOS: Alumno[] = [
  { id: 1,  nombre: "Sofía Aldana Torres",      completado: true  },
  { id: 2,  nombre: "Mateo Bernal Ríos",        completado: true  },
  { id: 3,  nombre: "Emilia Castillo Vega",     completado: false },
  { id: 4,  nombre: "Santiago Díaz Mora",       completado: false },
  { id: 5,  nombre: "Valentina Esquivel Luna",  completado: true  },
  { id: 6,  nombre: "Andrés Fuentes Paz",       completado: false },
  { id: 7,  nombre: "Isabella González Ruiz",   completado: false },
  { id: 8,  nombre: "Emilio Hernández Lima",    completado: true  },
  { id: 9,  nombre: "Camila Ibáñez Soto",       completado: false },
  { id: 10, nombre: "Rodrigo Jiménez Cruz",     completado: false },
  { id: 11, nombre: "Daniela Kuri Medina",      completado: false },
  { id: 12, nombre: "Fernando López Vidal",     completado: true  },
  { id: 13, nombre: "Renata Morales Serna",     completado: false },
  { id: 14, nombre: "Pablo Navarro Ríos",       completado: false },
  { id: 15, nombre: "Lucía Ortega Peña",        completado: false },
];

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
function VerificacionStep({ onContinue }: { onContinue: (escuela: string) => void }) {
  const [codigo, setCodigo] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (codigo.trim().length < 3) { setError("Ingresa un código válido."); return; }
    onContinue("West Highs 2026");
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
          type="text" placeholder="Ej. WH-2026" value={codigo}
          onChange={e => { setCodigo(e.target.value.toUpperCase()); setError(""); }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Enter" && handleContinue()}
          style={{ ...inputStyle(focused), fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: error ? 6 : 20 }}
          autoFocus
        />
        {error && <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.rojo400 }}>{error}</p>}
        <BtnPrimario label="Continuar" onClick={handleContinue} disabled={codigo.trim().length === 0} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 2 — Seleccionar grupo (botones grandes)
// ─────────────────────────────────────────────
function SeleccionarGrupoStep({ escuela, onBack, onContinue }: {
  escuela: string; onBack: () => void; onContinue: (grupo: string) => void;
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

        {/* Grid de grupos — un clic y avanza directamente */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}>
          {GRUPOS.map(g => (
            <button
              key={g}
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
              {g}
            </button>
          ))}
        </div>

        <BtnSecundario label="Atrás" onClick={onBack} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 3 — Tipo de evaluación
// ─────────────────────────────────────────────
function SeleccionarEvaluacionStep({ escuela, grupo, onBack, onContinue }: {
  escuela: string; grupo: string; onBack: () => void; onContinue: (tipo: TipoEvaluacion) => void;
}) {
  return (
    <div style={cardStyle}>
      <LogoHeader escuela={escuela} grupo={grupo} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          ¿Qué tipo de evaluación?
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: COLORS.neutro500 }}>
          Toca el formulario que van a responder hoy.
        </p>

        {/* Botones grandes — un clic y avanza */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {TIPOS_EVALUACION.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => onContinue(tipo)}
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
                el.style.borderColor = tipo.colorText;
                el.style.background = tipo.color;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.borderColor = COLORS.neutro100;
                el.style.background = "#fff";
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: tipo.color, border: `1.5px solid ${tipo.colorText}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: tipo.colorText, opacity: 0.7 }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>{tipo.label}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke={COLORS.neutro400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        <BtnSecundario label="Atrás" onClick={onBack} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paso 4 — Seleccionar alumno (lista grande, sin buscar)
// ─────────────────────────────────────────────
function SeleccionarAlumnoStep({ escuela, grupo, evaluacion, onBack, onContinue }: {
  escuela: string; grupo: string; evaluacion: TipoEvaluacion;
  onBack: () => void; onContinue: (alumno: Alumno) => void;
}) {
  const [alumnoSel, setAlumnoSel] = useState<Alumno | null>(null);
  const pendientes = ALUMNOS.filter(a => !a.completado);

  return (
    <div style={{ ...cardStyle, width: 420 }}>
      <LogoHeader escuela={escuela} grupo={`${grupo} · ${evaluacion.label}`} />
      <div style={cardBodyStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
          ¿Quién va a responder?
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.neutro500 }}>
          {pendientes.length} alumnos pendientes · toca un nombre para seleccionar.
        </p>

        {/* Lista alta sin scroll forzado — todos visibles */}
        <div style={{
          border: `1px solid ${COLORS.neutro100}`,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 18,
        }}>
          {pendientes.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center" as const, fontSize: 14, color: COLORS.neutro400 }}>
              Todos los alumnos han completado la evaluación ✓
            </div>
          ) : pendientes.map((a, idx) => {
            const sel = alumnoSel?.id === a.id;
            return (
              <div
                key={a.id}
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
                {/* Avatar con inicial */}
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: sel ? COLORS.violeta400 : COLORS.neutro100,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600,
                  color: sel ? "#fff" : COLORS.neutro500,
                  transition: "all 0.15s",
                }}>
                  {a.nombre.charAt(0)}
                </div>

                {/* Nombre completo */}
                <span style={{
                  fontSize: 14, flex: 1,
                  color: sel ? COLORS.violeta700 : COLORS.neutro900,
                  fontWeight: sel ? 600 : 400,
                }}>
                  {a.nombre}
                </span>

                {/* Check si está seleccionado */}
                {sel && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="10" fill={COLORS.violeta400}/>
                    <path d="M5.5 10L8.5 13L14.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
// Pantalla de inicio de encuesta
// ─────────────────────────────────────────────
function EncuestaActiva({ alumno, evaluacion, onTerminar }: {
  alumno: Alumno; evaluacion: TipoEvaluacion; onTerminar: () => void;
}) {
  return (
    <div style={{ ...cardStyle, width: 380 }}>
      <LogoHeader escuela={evaluacion.label} />
      <div style={{ ...cardBodyStyle, textAlign: "center" as const, padding: "36px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: COLORS.neutro900 }}>
          ¡Listo, {alumno.nombre.split(" ")[0]}!
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: COLORS.neutro500 }}>
          Vas a responder la evaluación de <strong>{evaluacion.label}</strong>.<br/>
          Toca "Comenzar" cuando estés listo.
        </p>
        <BtnPrimario label="Comenzar evaluación" onClick={onTerminar} />
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
  const [grupo, setGrupo] = useState("");
  const [evaluacion, setEvaluacion] = useState<TipoEvaluacion | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);

  const PASOS: Seccion[] = ["verificacion", "seleccionarGrupo", "seleccionarEvaluacion", "seleccionarAlumno"];
  const pasoActual = PASOS.indexOf(seccion);
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "24px",
      background: `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 60%, ${COLORS.azul50} 100%)`,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* Indicador de pasos */}
      {seccion !== "encuesta" && (
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
                    ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

      {seccion === "verificacion" && (
        <VerificacionStep onContinue={(esc) => { setEscuela(esc); setSeccion("seleccionarGrupo"); }} />
      )}
      {seccion === "seleccionarGrupo" && (
        <SeleccionarGrupoStep escuela={escuela} onBack={() => setSeccion("verificacion")}
          onContinue={(g) => { setGrupo(g); setSeccion("seleccionarEvaluacion"); }} />
      )}
      {seccion === "seleccionarEvaluacion" && (
        <SeleccionarEvaluacionStep escuela={escuela} grupo={grupo} onBack={() => setSeccion("seleccionarGrupo")}
          onContinue={(tipo) => { setEvaluacion(tipo); setSeccion("seleccionarAlumno"); }} />
      )}
      {seccion === "seleccionarAlumno" && evaluacion && (
        <SeleccionarAlumnoStep escuela={escuela} grupo={grupo} evaluacion={evaluacion}
          onBack={() => setSeccion("seleccionarEvaluacion")}
          onContinue={(a) => { setAlumno(a); setSeccion("encuesta"); }} />
      )}
      {seccion === "encuesta" && alumno && evaluacion && (
        <EncuestaActiva alumno={alumno} evaluacion={evaluacion}
          onTerminar={() => {
            navigate("/test-reactivo");
            // Conecta aquí con <Reactivo />
            // Ejemplo: navigate(`/reactivo?alumno=${alumno.id}&formulario=${evaluacion.id}`)
            alert(`Iniciando evaluación de ${evaluacion.label} para ${alumno.nombre}`);
          }}
        />
      )}
    </div>
  );
}