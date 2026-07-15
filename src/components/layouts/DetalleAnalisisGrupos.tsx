import COLORS from "../../utils/Colors";

type EstadoGrupo = "completo" | "en_progreso" | "sin_iniciar";

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

export default function DetalleAnalisisGrupos({
  grupos,
  onSelectGrupo,
  onCreateGrupo,
}: {
  grupos: Grupo[];
  grupoSeleccionado?: Grupo | null;
  onSelectGrupo: (grupo: Grupo) => void;
  onCreateGrupo: () => void;
  onCloseDetalle?: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Grupos</h2>
          <button
            onClick={onCreateGrupo}
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
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          gap: 12,
          transition: "grid-template-columns 0.2s",
        }}>
          {grupos.map(grupo => (
            <GrupoCard
              key={grupo.id}
              grupo={grupo}
              onClick={() => onSelectGrupo(grupo)}
            />
          ))}

          <div
            onClick={onCreateGrupo}
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
    </div>
  );
}