import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import Table from "../components/Table";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import type { ColegioConTotalEvaluaciones } from "../utils/types";

interface FormState {
  nombre: string;
  claveAcceso: string;
}

const emptyForm = (): FormState => ({ nombre: "", claveAcceso: "" });

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function Colegios() {
  const navigate = useNavigate();

  const [colegios, setColegios] = useState<ColegioConTotalEvaluaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColegio, setEditingColegio] = useState<ColegioConTotalEvaluaciones | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const cargarColegios = () => {
    setLoading(true);
    setError(null);
    databaseService.admin.listarColegios()
      .then(setColegios)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los colegios"))
      .finally(() => setLoading(false));
  };

  useEffect(cargarColegios, []);

  const filteredColegios = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colegios;
    return colegios.filter(colegio => colegio.nombre.toLowerCase().includes(q));
  }, [colegios, query]);

  const totalEvaluaciones = useMemo(
    () => colegios.reduce((sum, colegio) => sum + Number(colegio.totalEvaluaciones), 0),
    [colegios]
  );
  const sinEvaluaciones = colegios.filter(colegio => Number(colegio.totalEvaluaciones) === 0).length;

  const openCreateModal = () => {
    setEditingColegio(null);
    setForm(emptyForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (colegio: ColegioConTotalEvaluaciones) => {
    setEditingColegio(colegio);
    setForm({ nombre: colegio.nombre, claveAcceso: colegio.claveAcceso });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.claveAcceso.trim()) {
      setFormError("Nombre y clave de acceso son requeridos.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingColegio) {
        await databaseService.admin.actualizarColegio(editingColegio.id, {
          nombre: form.nombre.trim(),
          claveAcceso: form.claveAcceso.trim(),
        });
      } else {
        await databaseService.admin.crearColegio({
          nombre: form.nombre.trim(),
          claveAcceso: form.claveAcceso.trim(),
        });
      }
      setIsModalOpen(false);
      setEditingColegio(null);
      setForm(emptyForm());
      cargarColegios();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar el colegio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gestión
            </p>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: COLORS.neutro900 }}>Colegios</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar colegio..."
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, fontSize: 14, outline: "none", width: 220 }}
            />
            <button
              onClick={openCreateModal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 8,
                background: COLORS.violeta400,
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
              Nuevo colegio
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Total de colegios</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{colegios.length}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Evaluaciones totales</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{totalEvaluaciones}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Sin evaluaciones aún</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{sinEvaluaciones}</div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
          {error ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: COLORS.rojo600 }}>
              {error}
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: "nombre",
                  header: "Colegio",
                  render: colegio => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.violeta50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-school" style={{ fontSize: 16, color: COLORS.violeta400 }} aria-hidden="true" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: COLORS.neutro900 }}>{colegio.nombre}</div>
                        <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Creado {formatFecha(colegio.createdAt)}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "claveAcceso",
                  header: "Clave de acceso",
                  render: colegio => (
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: COLORS.neutro700 }}>{colegio.claveAcceso}</span>
                  ),
                },
                {
                  key: "evaluaciones",
                  header: "Evaluaciones",
                  render: colegio => <span style={{ color: COLORS.neutro700 }}>{colegio.totalEvaluaciones}</span>,
                },
                {
                  key: "acciones",
                  header: "Acciones",
                  align: "right",
                  render: colegio => (
                    <div data-no-row-click="true" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <ActionButton label="Editar" onClick={() => openEditModal(colegio)} />
                      <ActionButton label="Crear evaluación" variant="primary" onClick={() => navigate("/admin/evaluaciones")} />
                    </div>
                  ),
                },
              ]}
              data={filteredColegios}
              getRowKey={colegio => colegio.id}
              emptyState={loading ? "Cargando colegios..." : "No hay colegios para mostrar."}
            />
          )}
        </div>
      </main>

      {isModalOpen && (
        <Modal title={editingColegio ? "Editar colegio" : "Crear colegio"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Nombre del colegio</label>
              <input
                value={form.nombre}
                onChange={event => setForm(prev => ({ ...prev, nombre: event.target.value }))}
                placeholder="Ej. Colegio San Martín"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Clave de acceso</label>
              <input
                value={form.claveAcceso}
                onChange={event => setForm(prev => ({ ...prev, claveAcceso: event.target.value }))}
                placeholder="Ej. san-martin-2026"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: COLORS.neutro500 }}>
                Esta es la clave que el facilitador usará para acceder a las encuestas y reportes de este colegio.
              </p>
            </div>

            {formError && <p style={{ margin: 0, fontSize: 13, color: COLORS.rojo600 }}>{formError}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6 }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: `1px solid ${COLORS.neutro100}`, color: COLORS.neutro700, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, background: COLORS.violeta400, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : editingColegio ? "Guardar cambios" : "Crear colegio"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
