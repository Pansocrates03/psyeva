import { useEffect, useMemo, useState } from "react";
import COLORS from "@/utils/Colors";
import { ApiError, databaseService } from "@/services/databaseService";
import type { EvaluacionPublica } from "@/utils/types";
import ClipboardCopy from "@/components/ClipboardCopy";
import logoPsyeva from "@/assets/Psyeva_logo.png";

interface ColegioEvaluaciones {
  id: string;
  nombre: string;
  evaluaciones: EvaluacionPublica[];
}

function fechaLegible(fecha: string) {
  const iso = fecha.includes("T") ? fecha : `${fecha}T00:00:00Z`;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function etiquetaEstado(estado: EvaluacionPublica["estado"]) {
  if (estado === "abierto") return { texto: "Abierta", color: COLORS.verde600, fondo: COLORS.verde50 };
  if (estado === "publico") return { texto: "Resultados publicados", color: COLORS.violeta600, fondo: COLORS.violeta50 };
  return { texto: "Programada", color: COLORS.azul600, fondo: COLORS.azul50 };
}

export default function Evaluacion() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPublica[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarEvaluaciones = () => {
    setCargando(true);
    setError(null);
    databaseService.publico.listarEvaluaciones()
      .then(setEvaluaciones)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las escuelas."))
      .finally(() => setCargando(false));
  };

  useEffect(cargarEvaluaciones, []);

  const colegios = useMemo<ColegioEvaluaciones[]>(() => {
    const porColegio = new Map<string, ColegioEvaluaciones>();
    for (const evaluacion of evaluaciones) {
      let colegio = porColegio.get(evaluacion.colegioId);
      if (!colegio) {
        colegio = { id: evaluacion.colegioId, nombre: evaluacion.colegioNombre, evaluaciones: [] };
        porColegio.set(colegio.id, colegio);
      }
      colegio.evaluaciones.push(evaluacion);
    }
    return [...porColegio.values()];
  }, [evaluaciones]);

  const colegiosFiltrados = colegios.filter(colegio => colegio.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const colegioActivo = colegios.find(colegio => colegio.id === seleccionado);
  const origen = window.location.origin;

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px 56px", boxSizing: "border-box", background: `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 58%, ${COLORS.azul50} 100%)`, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "min(100%, 920px)", margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <img src={logoPsyeva} alt="PSYEVA" style={{ width: 52, height: 52, objectFit: "contain" }} />
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: COLORS.violeta600, textTransform: "uppercase", letterSpacing: "0.08em" }}>PSYEVA</p>
            <h1 style={{ margin: 0, fontSize: 24, color: COLORS.neutro900 }}>Evaluaciones por escuela</h1>
          </div>
        </header>

        {colegioActivo ? (
          <section style={{ padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)" }}>
            <button type="button" onClick={() => setSeleccionado(null)} style={{ marginBottom: 20, padding: 0, border: 0, background: "none", color: COLORS.violeta600, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              ← Todas las escuelas
            </button>
            <h2 style={{ margin: "0 0 6px", fontSize: 21, color: COLORS.neutro900 }}>{colegioActivo.nombre}</h2>
            <p style={{ margin: "0 0 22px", color: COLORS.neutro500, fontSize: 14 }}>Enlaces de sus evaluaciones</p>

            <div style={{ display: "grid", gap: 14 }}>
              {colegioActivo.evaluaciones.map(evaluacion => {
                const estado = etiquetaEstado(evaluacion.estado);
                const urlEncuesta = `${origen}/e/${evaluacion.codigoAcceso.trim()}`;
                const urlReportes = `${origen}/reportes/${evaluacion.codigoAcceso.trim()}`;
                return (
                  <article key={evaluacion.codigoAcceso} style={{ padding: 18, border: `1px solid ${COLORS.neutro100}`, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px", fontSize: 16, color: COLORS.neutro900 }}>{evaluacion.evaluacionNombre}</h3>
                        <p style={{ margin: 0, fontSize: 13, color: COLORS.neutro500 }}>Fecha: {fechaLegible(evaluacion.fecha)}</p>
                      </div>
                      <span style={{ padding: "5px 10px", borderRadius: 20, color: estado.color, background: estado.fondo, fontSize: 12, fontWeight: 600 }}>{estado.texto}</span>
                    </div>

                    {evaluacion.estado !== "publico" ? (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: COLORS.neutro700 }}>Enlace de la encuesta</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ overflowX: "auto" }}><ClipboardCopy copyText={urlEncuesta} /></div>
                          <a href={urlEncuesta} style={{ color: COLORS.violeta600, fontSize: 13, fontWeight: 600 }}>Abrir encuesta</a>
                        </div>
                        {evaluacion.estado === "cerrado" && <p style={{ margin: "7px 0 0", fontSize: 12, color: COLORS.neutro500 }}>El enlace funcionará cuando se abra la evaluación.</p>}
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: COLORS.neutro700 }}>Enlace de reportes</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ overflowX: "auto" }}><ClipboardCopy copyText={urlReportes} /></div>
                          <a href={urlReportes} style={{ color: COLORS.violeta600, fontSize: 13, fontWeight: 600 }}>Abrir reportes</a>
                        </div>
                        <p style={{ margin: "7px 0 0", fontSize: 12, color: COLORS.neutro500 }}>Para consultar los reportes se solicitará la clave de acceso de la escuela.</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section>
            <p style={{ margin: "0 0 16px", color: COLORS.neutro700, fontSize: 15 }}>Selecciona una escuela para consultar los enlaces de sus evaluaciones.</p>

            {cargando ? (
              <p style={{ padding: 20, textAlign: "center", color: COLORS.neutro500 }}>Cargando escuelas...</p>
            ) : error ? (
              <div style={{ padding: 20, borderRadius: 12, background: "#fff", textAlign: "center" }}>
                <p style={{ color: COLORS.rojo400 }}>{error}</p>
                <button type="button" onClick={cargarEvaluaciones} style={{ padding: "9px 16px", border: 0, borderRadius: 8, background: COLORS.violeta400, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Reintentar</button>
              </div>
            ) : colegiosFiltrados.length === 0 ? (
              <p style={{ padding: 20, borderRadius: 12, background: "#fff", textAlign: "center", color: COLORS.neutro500 }}>{colegios.length ? "No hay escuelas que coincidan con la búsqueda." : "Todavía no hay evaluaciones programadas."}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {colegiosFiltrados.map(colegio => (
                  <button key={colegio.id} type="button" onClick={() => setSeleccionado(colegio.id)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 76, padding: "16px 18px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 12, background: "#fff", textAlign: "left", cursor: "pointer", boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
                    <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: COLORS.violeta50, color: COLORS.violeta600 }}><i className="ti ti-school" aria-hidden="true" /></span>
                    <span style={{ flex: 1, color: COLORS.neutro900, fontSize: 14, fontWeight: 600 }}>{colegio.nombre}</span>
                    <span style={{ color: COLORS.neutro500, fontSize: 12, whiteSpace: "nowrap" }}>{colegio.evaluaciones.length} {colegio.evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}</span>
                    <i className="ti ti-chevron-right" style={{ color: COLORS.neutro400 }} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
