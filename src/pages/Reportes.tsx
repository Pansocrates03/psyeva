import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import COLORS from "@/utils/Colors";
import { databaseService, ApiError } from "@/services/databaseService";
import type { EvaluacionParaFacilitador, ReporteConContexto, TipoReporte } from "@/utils/types";

// ─────────────────────────────────────────────
// Estilos compartidos (mismo lenguaje visual que Encuesta.tsx)
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

function LogoHeader({ escuela, sub }: { escuela?: string; sub?: string }) {
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
          {sub && <div style={{ fontSize: 11, color: COLORS.neutro500 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function CentroPagina({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "24px",
      background: `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 60%, ${COLORS.azul50} 100%)`,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Lista de reportes ya verificados
// ─────────────────────────────────────────────
const TIPO_META: Record<TipoReporte, { titulo: string; icono: string }> = {
  general: { titulo: "Reporte general", icono: "📊" },
  grupal: { titulo: "Reportes por grupo", icono: "👥" },
  individual: { titulo: "Reportes individuales", icono: "🧑‍🎓" },
};

function nombreDeReporte(reporte: ReporteConContexto) {
  if (reporte.tipo === "grupal") return reporte.grupoNombre ?? "Grupo";
  if (reporte.tipo === "individual") return reporte.estudianteNombre ?? "Alumno";
  return "Reporte general de la evaluación";
}

function SeccionReportes({ tipo, reportes }: { tipo: TipoReporte; reportes: ReporteConContexto[] }) {
  const meta = TIPO_META[tipo];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{meta.icono}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COLORS.neutro900 }}>{meta.titulo}</h3>
        <span style={{ fontSize: 12, color: COLORS.neutro500 }}>({reportes.length})</span>
      </div>

      {reportes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: COLORS.neutro400 }}>Todavía no hay reportes de este tipo.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reportes.map(r => (
            <a
              key={r.id}
              href={r.archivoUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${COLORS.neutro100}`, background: "#fff",
                textDecoration: "none", color: COLORS.neutro900, fontSize: 14,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = COLORS.violeta400; (e.currentTarget as HTMLAnchorElement).style.background = COLORS.violeta50; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = COLORS.neutro100; (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; }}
            >
              <i className="ti ti-file-type-pdf" style={{ fontSize: 18, color: COLORS.rojo400 }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{nombreDeReporte(r)}</span>
              <i className="ti ti-download" style={{ fontSize: 16, color: COLORS.neutro500 }} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function Reportes() {
  const { id: evaluacionId } = useParams<{ id: string }>();

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [info, setInfo] = useState<EvaluacionParaFacilitador | null>(null);

  const [clave, setClave] = useState("");
  const [focused, setFocused] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [claveError, setClaveError] = useState("");
  const [verificado, setVerificado] = useState<{ colegioNombre: string } | null>(null);

  const [reportes, setReportes] = useState<{ total: number; reportes: Record<TipoReporte, ReporteConContexto[]> } | null>(null);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [reportesError, setReportesError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluacionId) return;
    setLoadingInfo(true);
    setInfoError(null);
    databaseService.facilitador.obtenerInfoEvaluacion(evaluacionId)
      .then(setInfo)
      .catch(err => setInfoError(err instanceof ApiError ? err.message : "No se pudo cargar la evaluación"))
      .finally(() => setLoadingInfo(false));
  }, [evaluacionId]);

  const handleVerificar = async () => {
    if (!evaluacionId || clave.trim().length < 3) { setClaveError("Ingresa un código válido."); return; }

    setVerificando(true);
    setClaveError("");
    try {
      const { colegio } = await databaseService.facilitador.verificarConEvaluacion(evaluacionId, clave.trim());
      setVerificado({ colegioNombre: colegio.nombre });

      setLoadingReportes(true);
      try {
        const data = await databaseService.facilitador.listarReportes({ evaluacionId });
        setReportes(data);
      } catch (err) {
        setReportesError(err instanceof ApiError ? err.message : "No se pudieron cargar los reportes");
      } finally {
        setLoadingReportes(false);
      }
    } catch (err) {
      setClaveError(err instanceof ApiError ? err.message : "No se pudo verificar el código.");
    } finally {
      setVerificando(false);
    }
  };

  if (loadingInfo) {
    return (
      <CentroPagina>
        <div style={cardStyle}>
          <LogoHeader />
          <div style={{ ...cardBodyStyle, textAlign: "center", padding: "36px 24px" }}>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.neutro500 }}>Cargando...</p>
          </div>
        </div>
      </CentroPagina>
    );
  }

  if (infoError || !info) {
    return (
      <CentroPagina>
        <div style={cardStyle}>
          <LogoHeader />
          <div style={{ ...cardBodyStyle, textAlign: "center", padding: "36px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.rojo400 }}>{infoError ?? "Evaluación no encontrada"}</p>
          </div>
        </div>
      </CentroPagina>
    );
  }

  if (!info.reportesPublicados) {
    return (
      <CentroPagina>
        <div style={cardStyle}>
          <LogoHeader escuela={info.colegioNombre} sub={info.nombre} />
          <div style={{ ...cardBodyStyle, textAlign: "center", padding: "36px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.neutro500 }}>
              Los reportes de esta evaluación todavía no están publicados. Vuelve a intentarlo más tarde.
            </p>
          </div>
        </div>
      </CentroPagina>
    );
  }

  if (!verificado) {
    return (
      <CentroPagina>
        <div style={cardStyle}>
          <LogoHeader escuela={info.colegioNombre} sub={info.nombre} />
          <div style={cardBodyStyle}>
            <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>
              Ingresa el código de tu escuela
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.neutro500 }}>
              Necesitamos verificar tu clave de acceso para mostrarte los reportes de esta evaluación.
            </p>
            <label style={labelStyle}>Código de acceso</label>
            <input
              type="text" placeholder="Ej. san-jose-2026" value={clave}
              onChange={e => { setClave(e.target.value); setClaveError(""); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={e => e.key === "Enter" && handleVerificar()}
              style={{ ...inputStyle(focused), fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: claveError ? 6 : 20 }}
              autoFocus
            />
            {claveError && <p style={{ margin: "0 0 14px", fontSize: 12, color: COLORS.rojo400 }}>{claveError}</p>}
            <BtnPrimario label={verificando ? "Verificando..." : "Ver reportes"} onClick={handleVerificar} disabled={verificando || clave.trim().length === 0} />
          </div>
        </div>
      </CentroPagina>
    );
  }

  return (
    <CentroPagina>
      <div style={{ ...cardStyle, width: 460 }}>
        <LogoHeader escuela={verificado.colegioNombre} sub={info.nombre} />
        <div style={cardBodyStyle}>
          {loadingReportes ? (
            <p style={{ margin: 0, fontSize: 14, color: COLORS.neutro500, textAlign: "center" }}>Cargando reportes...</p>
          ) : reportesError ? (
            <p style={{ margin: 0, fontSize: 14, color: COLORS.rojo400, textAlign: "center" }}>{reportesError}</p>
          ) : reportes && reportes.total === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: COLORS.neutro500, textAlign: "center" }}>
              Todavía no hay reportes disponibles para esta evaluación.
            </p>
          ) : reportes ? (
            <>
              <SeccionReportes tipo="general" reportes={reportes.reportes.general} />
              <SeccionReportes tipo="grupal" reportes={reportes.reportes.grupal} />
              <SeccionReportes tipo="individual" reportes={reportes.reportes.individual} />
            </>
          ) : null}
        </div>
      </div>
    </CentroPagina>
  );
}
