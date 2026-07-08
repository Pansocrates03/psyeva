import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import COLORS from "../utils/Colors";

// ── Tipos ────────────────────────────────────────────────────
type EstadoGrupo = "completo" | "en_progreso" | "sin_iniciar";

interface Formulario {
  id: number;
  nombre: string;
  categoria: string;
  preguntas: number;
  asignado: boolean;
}

interface Grupo {
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
}

// ── Datos de muestra ─────────────────────────────────────────
const FORMULARIOS_DISPONIBLES: Formulario[] = [
  { id: 1, nombre: "Evaluación emocional",   categoria: "Emociones",   preguntas: 12, asignado: true  },
  { id: 2, nombre: "Bienestar psicológico",  categoria: "Bienestar",   preguntas: 18, asignado: true  },
  { id: 3, nombre: "Hábitos de aprendizaje", categoria: "Aprendizaje", preguntas: 15, asignado: true  },
  { id: 4, nombre: "Autoestima y confianza", categoria: "Autoestima",  preguntas: 10, asignado: false },
];

const GRUPOS_DATA: Grupo[] = [
  { id: 1, nombre: "1ro A", grado: "Primero",   estado: "completo",    alumnosEncuestados: 28, totalAlumnos: 28, reportesPublicados: 28, totalReportes: 28, reporteGrupal: true,  formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
  { id: 2, nombre: "1ro B", grado: "Primero",   estado: "completo",    alumnosEncuestados: 38, totalAlumnos: 38, reportesPublicados: 38, totalReportes: 38, reporteGrupal: true,  formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
  { id: 3, nombre: "1ro C", grado: "Primero",   estado: "completo",    alumnosEncuestados: 28, totalAlumnos: 28, reportesPublicados: 28, totalReportes: 28, reporteGrupal: true,  formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
  { id: 4, nombre: "2do A", grado: "Segundo",   estado: "en_progreso", alumnosEncuestados: 24, totalAlumnos: 32, reportesPublicados: 20, totalReportes: 28, reporteGrupal: false, formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
  { id: 5, nombre: "2do B", grado: "Segundo",   estado: "en_progreso", alumnosEncuestados: 28, totalAlumnos: 28, reportesPublicados: 28, totalReportes: 28, reporteGrupal: false, formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
  { id: 6, nombre: "3ro A", grado: "Tercero",   estado: "sin_iniciar", alumnosEncuestados: 0,  totalAlumnos: 25, reportesPublicados: 0,  totalReportes: 25, reporteGrupal: false, formularios: ["Emociones", "Bienestar", "Aprendizaje"] },
];

// ── Colores de badge por estado ───────────────────────────────
const ESTADO_CONFIG: Record<EstadoGrupo, { label: string; bg: string; color: string; border: string }> = {
  completo:    { label: "Completo",    bg: COLORS.verde50,  color: COLORS.verde600,  border: COLORS.verde100  },
  en_progreso: { label: "En progreso", bg: COLORS.ambar50,  color: COLORS.ambar600,  border: "#FDEFC0"        },
  sin_iniciar: { label: "Sin iniciar", bg: COLORS.azul50,   color: COLORS.azul600,   border: COLORS.azul100   },
};

const PILL_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  Emociones:   { bg: COLORS.violeta50, color: COLORS.violeta600, dot: COLORS.violeta400 },
  Bienestar:   { bg: COLORS.verde50,   color: COLORS.verde600,   dot: COLORS.verde400   },
  Aprendizaje: { bg: COLORS.azul50,    color: COLORS.azul600,    dot: COLORS.azul400    },
  Autoestima:  { bg: COLORS.ambar50,   color: COLORS.ambar600,   dot: COLORS.ambar400   },
};

// ── Subcomponentes ────────────────────────────────────────────
function ProgressRow({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: COLORS.neutro100, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, color: COLORS.neutro500, whiteSpace: "nowrap" }}>
        {value}/{total}
      </span>
    </div>
  );
}

function GrupoCard({ grupo, onClick }: { grupo: Grupo; onClick: () => void }) {
  const ec = ESTADO_CONFIG[grupo.estado];
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${COLORS.neutro100}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.violeta400;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 3px ${COLORS.violeta50}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.neutro100;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.neutro900 }}>{grupo.nombre}</span>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20,
          background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`,
        }}>
          {ec.label}
        </span>
      </div>

      {/* Métricas */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: COLORS.neutro500, marginBottom: 4 }}>Alumnos encuestados</div>
        <ProgressRow value={grupo.alumnosEncuestados} total={grupo.totalAlumnos} color={COLORS.violeta400} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: COLORS.neutro500, marginBottom: 4 }}>Reportes publicados</div>
        <ProgressRow value={grupo.reportesPublicados} total={grupo.totalReportes} color={COLORS.verde400} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.neutro500, marginBottom: 4 }}>Reporte grupal</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: grupo.reporteGrupal ? COLORS.verde600 : COLORS.neutro400, display: "flex", alignItems: "center", gap: 5 }}>
          <i className={`ti ${grupo.reporteGrupal ? "ti-check" : "ti-clock"}`} style={{ fontSize: 13 }} aria-hidden="true" />
          {grupo.reporteGrupal ? "1/1" : "0/1"}
        </div>
      </div>

      {/* Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {grupo.formularios.map(f => {
          const pc = PILL_COLORS[f] ?? { bg: COLORS.neutro50, color: COLORS.neutro700, dot: COLORS.neutro400 };
          return (
            <span key={f} style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 20,
              background: pc.bg, color: pc.color, border: `1px solid ${pc.bg}`,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: pc.dot }} />
              {f}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DrawerFormularios({ grupo, onClose }: { grupo: Grupo; onClose: () => void }) {
  const [forms, setForms] = useState<Formulario[]>(
    FORMULARIOS_DISPONIBLES.map(f => ({ ...f, asignado: grupo.formularios.includes(f.categoria) }))
  );

  const toggle = (id: number) =>
    setForms(prev => prev.map(f => f.id === id ? { ...f, asignado: !f.asignado } : f));

  return (
    <div style={{
      width: 300,
      flexShrink: 0,
      background: "#fff",
      border: `1px solid ${COLORS.neutro100}`,
      borderRadius: 12,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.neutro900 }}>{grupo.nombre}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.neutro500, fontSize: 18, padding: 0, display: "flex" }}>
          <i className="ti ti-x" aria-label="Cerrar" />
        </button>
      </div>
      <p style={{ fontSize: 12, color: COLORS.neutro500, margin: "0 0 16px" }}>
        {grupo.alumnosEncuestados} de {grupo.totalAlumnos} completados
      </p>

      {/* Formularios */}
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: COLORS.neutro400, margin: "0 0 8px", fontWeight: 500 }}>
        Formularios asignados
      </p>
      <div style={{ marginBottom: 20 }}>
        {forms.map(f => (
          <div key={f.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 0", borderBottom: `1px solid ${COLORS.neutro50}`,
          }}>
            <input
              type="checkbox"
              checked={f.asignado}
              onChange={() => toggle(f.id)}
              style={{ marginTop: 2, accentColor: COLORS.violeta400, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, color: COLORS.neutro900, fontWeight: 500 }}>{f.nombre}</div>
              <div style={{ fontSize: 11, color: COLORS.neutro500 }}>{f.categoria} · {f.preguntas} preguntas</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${COLORS.neutro100}` }}>
        <button onClick={onClose} style={{
          flex: 1, padding: "9px", borderRadius: 8, fontSize: 13,
          background: "none", border: `1px solid ${COLORS.neutro100}`,
          color: COLORS.neutro700, cursor: "pointer",
        }}>
          Cancelar
        </button>
        <button onClick={onClose} style={{
          flex: 1, padding: "9px", borderRadius: 8, fontSize: 13,
          background: COLORS.violeta400, border: "none",
          color: "#fff", fontWeight: 500, cursor: "pointer",
        }}>
          Guardar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function DetalleAnalisis() {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [showCrearGrupo, setShowCrearGrupo] = useState(false);

  const totalAlumnos    = GRUPOS_DATA.reduce((s, g) => s + g.totalAlumnos, 0);
  const totalReportes   = GRUPOS_DATA.reduce((s, g) => s + g.reportesPublicados, 0);
  const pendientes      = GRUPOS_DATA.reduce((s, g) => s + (g.totalAlumnos - g.alumnosEncuestados), 0);
  const gruposPendientes = GRUPOS_DATA.filter(g => g.estado !== "completo").length;

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
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton label="Exportar Datos" icon="ti-download" />
            <ActionButton label="Subir Reportes" icon="ti-file-upload" />
            <ActionButton label="Ver Dashboard"  icon="ti-chart-bar" variant="primary" />
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Grupos"     value={GRUPOS_DATA.length} accent />
          <StatCard label="Estudiantes" value={totalAlumnos} />
          <StatCard label="Reportes"   value={totalReportes} sub={`${Math.round((totalReportes / totalAlumnos) * 100)}% de alumnos tienen reporte`} />
          <StatCard label="Pendientes" value={pendientes} sub={`en ${gruposPendientes} grupos`} />
        </div>

        {/* Layout principal */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Grid de grupos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Grupos</h2>
              <button
                onClick={() => setShowCrearGrupo(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8,
                  background: "#fff", border: `1px solid ${COLORS.neutro100}`,
                  color: COLORS.neutro700, fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
                Crear Grupo
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: grupoSeleccionado ? "repeat(2, minmax(0,1fr))" : "repeat(3, minmax(0,1fr))",
              gap: 12,
              transition: "grid-template-columns 0.2s",
            }}>
              {GRUPOS_DATA.map(grupo => (
                <GrupoCard
                  key={grupo.id}
                  grupo={grupo}
                  onClick={() => setGrupoSeleccionado(g => g?.id === grupo.id ? null : grupo)}
                />
              ))}

              {/* Tarjeta vacía */}
              <div
                onClick={() => setShowCrearGrupo(true)}
                style={{
                  border: `1.5px dashed ${COLORS.neutro100}`,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 180,
                  gap: 6,
                  cursor: "pointer",
                  color: COLORS.neutro400,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.violeta400;
                  (e.currentTarget as HTMLDivElement).style.color = COLORS.violeta400;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = COLORS.neutro100;
                  (e.currentTarget as HTMLDivElement).style.color = COLORS.neutro400;
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: 22 }} aria-hidden="true" />
                <span style={{ fontSize: 13 }}>Agregar grupo</span>
              </div>
            </div>
          </div>

          {/* Drawer lateral */}
          {grupoSeleccionado && (
            <DrawerFormularios
              grupo={grupoSeleccionado}
              onClose={() => setGrupoSeleccionado(null)}
            />
          )}
        </div>
      </main>

      {/* Modal Crear Grupo */}
      {showCrearGrupo && (
        <Modal title="Crear grupo" onClose={() => setShowCrearGrupo(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: COLORS.neutro700, marginBottom: 6 }}>
                Nombre del grupo
              </label>
              <input
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: COLORS.neutro700, marginBottom: 6 }}>
                Grado
              </label>
              <input
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
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={() => setShowCrearGrupo(false)} style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 14,
                background: "none", border: `1px solid ${COLORS.neutro100}`,
                color: COLORS.neutro700, cursor: "pointer",
              }}>
                Cancelar
              </button>
              <button onClick={() => setShowCrearGrupo(false)} style={{
                padding: "9px 20px", borderRadius: 8, fontSize: 14,
                background: COLORS.violeta400, border: "none",
                color: "#fff", fontWeight: 500, cursor: "pointer",
              }}>
                Crear
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}