import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import EstadoBadge from "../components/EstadoBadge";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import type { ColegioConTotalEvaluaciones, EvaluacionConProgreso } from "../utils/types";

type Filtro = "todos" | "aceptando" | "publicadas";

function estadoDe(evaluacion: EvaluacionConProgreso) {
  if (evaluacion.aceptaRespuestas) return "activo" as const;
  if (evaluacion.reportesPublicados) return "archivado" as const;
  return "sin_iniciar" as const;
}

function formatFecha(fecha: string) {
  // Postgres serializa DATE como ISO datetime completo en UTC medianoche
  // (...T00:00:00.000Z). Hay que formatear en UTC también, si no el
  // navegador la corre un día para atrás en timezones negativos.
  const iso = fecha.includes("T") ? fecha : `${fecha}T00:00:00Z`;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function MisAnalisis() {
  const navigate = useNavigate();

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionConProgreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [showModal, setShowModal] = useState(false);
  const [colegios, setColegios] = useState<ColegioConTotalEvaluaciones[]>([]);
  const [form, setForm] = useState({ colegioId: "", nombre: "", fecha: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarEvaluaciones = () => {
    setLoading(true);
    setError(null);
    databaseService.admin.listarEvaluaciones()
      .then(setEvaluaciones)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las evaluaciones"))
      .finally(() => setLoading(false));
  };

  useEffect(cargarEvaluaciones, []);

  const aceptando = evaluaciones.filter(e => e.aceptaRespuestas);
  const publicadas = evaluaciones.filter(e => e.reportesPublicados);

  const filtradas = filtro === "aceptando" ? aceptando
                   : filtro === "publicadas" ? publicadas
                   : evaluaciones;

  const abrirCrearModal = () => {
    setForm({ colegioId: "", nombre: "", fecha: "" });
    setFormError(null);
    setShowModal(true);
    databaseService.admin.listarColegios()
      .then(setColegios)
      .catch(err => setFormError(err instanceof ApiError ? err.message : "No se pudieron cargar los colegios"));
  };

  const handleCrear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.colegioId || !form.nombre.trim() || !form.fecha) {
      setFormError("Completa colegio, nombre y fecha.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await databaseService.admin.crearEvaluacion({
        colegioId: form.colegioId,
        nombre: form.nombre.trim(),
        fecha: form.fecha,
      });
      setShowModal(false);
      cargarEvaluaciones();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo crear la evaluación");
    } finally {
      setSaving(false);
    }
  };

  const cerrarEvaluacion = async (id: string) => {
    try {
      await databaseService.admin.cambiarEstadoEvaluacion(id, "aceptaRespuestas", false);
      cargarEvaluaciones();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cerrar la evaluación");
    }
  };

  const eliminarEvaluacion = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación? Esta acción no se puede deshacer.")) return;
    try {
      await databaseService.admin.eliminarEvaluacion(id);
      cargarEvaluaciones();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar la evaluación");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, color: COLORS.neutro900 }}>Evaluaciones</h1>
          <button
            onClick={abrirCrearModal}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 8,
              background: COLORS.violeta400, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Crear evaluación
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Todas" value={evaluaciones.length} onClick={() => setFiltro("todos")} accent={filtro === "todos"} />
          <StatCard label="Aceptando respuestas" value={aceptando.length} onClick={() => setFiltro("aceptando")} accent={filtro === "aceptando"} />
          <StatCard label="Reportes publicados" value={publicadas.length} onClick={() => setFiltro("publicadas")} accent={filtro === "publicadas"} />
        </div>

        <div style={{
          background: "#fff",
          border: `1px solid ${COLORS.neutro100}`,
          borderRadius: 14,
          overflow: "hidden",
        }}>
          {error ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: COLORS.rojo600 }}>
              {error}
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: "colegio",
                  header: "Colegio",
                  render: item => (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: COLORS.violeta50,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <i className="ti ti-school" style={{ fontSize: 14, color: COLORS.violeta400 }} aria-hidden="true" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: COLORS.neutro900 }}>{item.nombre}</div>
                          <div style={{ fontSize: 12, color: COLORS.neutro500 }}>{item.colegioNombre}</div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "estado",
                  header: "Estado",
                  render: item => <EstadoBadge estado={estadoDe(item)} />,
                },
                {
                  key: "progreso",
                  header: "Progreso",
                  render: item => (
                    <span style={{ color: COLORS.neutro700 }}>
                      {item.sesionesCompletadas} / {Number(item.sesionesCompletadas) + Number(item.sesionesPendientes)} sesiones · {item.totalAlumnos} alumnos
                    </span>
                  ),
                },
                {
                  key: "fecha",
                  header: "Fecha",
                  render: item => <span style={{ color: COLORS.neutro500 }}>{formatFecha(item.fecha)}</span>,
                },
                {
                  key: "acciones",
                  header: "Acciones",
                  align: "right",
                  render: item => (
                    <div data-no-row-click="true" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {item.aceptaRespuestas
                        ? <ActionButton label="Cerrar" variant="archive" onClick={() => cerrarEvaluacion(item.evaluacionId)} />
                        : <ActionButton label="Eliminar" variant="danger" onClick={() => eliminarEvaluacion(item.evaluacionId)} />
                      }
                    </div>
                  ),
                },
              ]}
              data={filtradas}
              getRowKey={item => item.evaluacionId}
              onRowClick={item => navigate(`/admin/evaluaciones/${item.evaluacionId}`)}
              emptyState={loading ? "Cargando evaluaciones..." : "No hay evaluaciones para mostrar."}
            />
          )}

          <div style={{
            padding: "12px 20px",
            borderTop: `1px solid ${COLORS.neutro100}`,
            fontSize: 13,
            color: COLORS.neutro500,
          }}>
            {!loading && !error && `Mostrando ${filtradas.length} de ${evaluaciones.length} evaluaciones`}
          </div>
        </div>
      </main>

      {showModal && (
        <Modal title="Crear evaluación" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Colegio</label>
              <select
                value={form.colegioId}
                onChange={event => setForm(prev => ({ ...prev, colegioId: event.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              >
                <option value="">Selecciona un colegio...</option>
                {colegios.map(colegio => (
                  <option key={colegio.id} value={colegio.id}>{colegio.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Nombre de la evaluación</label>
              <input
                value={form.nombre}
                onChange={event => setForm(prev => ({ ...prev, nombre: event.target.value }))}
                placeholder="Ej. Evaluación primer semestre 2026"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={event => setForm(prev => ({ ...prev, fecha: event.target.value }))}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {formError && <p style={{ margin: 0, fontSize: 13, color: COLORS.rojo600 }}>{formError}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: `1px solid ${COLORS.neutro100}`, color: COLORS.neutro700, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, background: COLORS.violeta400, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Creando..." : "Crear evaluación"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
