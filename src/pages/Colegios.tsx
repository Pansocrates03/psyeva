import { useMemo, useState, type FormEvent } from "react";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import Table from "../components/Table";
import COLORS from "../utils/Colors";

type EstadoColegio = "activo" | "en revisión" | "inactivo";

interface Colegio {
  id: number;
  nombre: string;
  evaluaciones: number;
  estado: EstadoColegio;
  fecha: string;
}

interface FormState {
  nombre: string;
  evaluaciones: string;
  estado: EstadoColegio;
}

const INITIAL_COLEGIOS: Colegio[] = [
  { id: 1, nombre: "Colegio Nuevo Continente", evaluaciones: 12, estado: "activo", fecha: "14 nov 2026" },
  { id: 2, nombre: "Instituto Irlanda", evaluaciones: 8, estado: "activo", fecha: "2 dic 2026" },
  { id: 3, nombre: "Liceo de la Esperanza", evaluaciones: 4, estado: "en revisión", fecha: "9 ene 2027" },
  { id: 4, nombre: "Colegio San José", evaluaciones: 2, estado: "inactivo", fecha: "21 mar 2026" },
];

const ESTADO_META: Record<EstadoColegio, { label: string; bg: string; color: string; border: string }> = {
  activo: { label: "Activo", bg: COLORS.verde50, color: COLORS.verde600, border: COLORS.verde100 },
  "en revisión": { label: "En revisión", bg: COLORS.ambar50, color: COLORS.ambar600, border: "#FDEFC0" },
  inactivo: { label: "Inactivo", bg: COLORS.rojo50, color: COLORS.rojo600, border: "#FFC9C9" },
};

const emptyForm = (): FormState => ({
  nombre: "",
  evaluaciones: "",
  estado: "activo",
});

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function Colegios() {
  const [colegios, setColegios] = useState<Colegio[]>(INITIAL_COLEGIOS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColegio, setEditingColegio] = useState<Colegio | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [query, setQuery] = useState("");

  console.log("colegios", colegios);

  const filteredColegios = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colegios;
    return colegios.filter(colegio =>
      [colegio.nombre].some(value => value.toLowerCase().includes(q))
    );
  }, [colegios, query]);

  const totalEvaluaciones = useMemo(() => colegios.reduce((sum, colegio) => sum + toNumber(colegio.evaluaciones), 0), [colegios]);
  const activos = colegios.filter(colegio => colegio.estado === "activo").length;

  const openCreateModal = () => {
    setEditingColegio(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (colegio: Colegio) => {
    setEditingColegio(colegio);
    setForm({
      nombre: colegio.nombre,
      evaluaciones: String(colegio.evaluaciones),
      estado: colegio.estado,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      return;
    }

    const payload: Colegio = {
      id: editingColegio?.id ?? Date.now(),
      nombre: form.nombre.trim(),
      evaluaciones: toNumber(form.evaluaciones),
      estado: form.estado,
      fecha: editingColegio?.fecha ?? new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
    };

    if (editingColegio) {
      setColegios(prev => prev.map(colegio => colegio.id === editingColegio.id ? payload : colegio));
    } else {
      setColegios(prev => [payload, ...prev]);
    }

    setIsModalOpen(false);
    setEditingColegio(null);
    setForm(emptyForm());
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

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Total de colegios</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{colegios.length}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Evaluaciones</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{totalEvaluaciones}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Activos</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{activos}</div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>

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
                      <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Creado {colegio.fecha}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: "estado",
                header: "Estado",
                render: colegio => {
                  const meta = ESTADO_META[colegio.estado];
                  return (
                    <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                      {meta.label}
                    </span>
                  );
                },
              },
              {
                key: "evaluaciones",
                header: "Evaluaciones",
                render: colegio => <span style={{ color: COLORS.neutro700 }}>{colegio.evaluaciones}</span>,
              },
              {
                key: "acciones",
                header: "Acciones",
                align: "right",
                render: colegio => (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <ActionButton label="Editar" onClick={() => openEditModal(colegio)} />
                    <ActionButton label="Crear evaluación" variant="primary" />
                  </div>
                ),
              },
            ]}
            data={filteredColegios}
            getRowKey={colegio => colegio.id}
            emptyState="No hay colegios para mostrar."
          />
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Estado</label>
              <select
                value={form.estado}
                onChange={event => setForm(prev => ({ ...prev, estado: event.target.value as EstadoColegio }))}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
              >
                <option value="activo">Activo</option>
                <option value="en revisión">En revisión</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6 }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: `1px solid ${COLORS.neutro100}`, color: COLORS.neutro700, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, background: COLORS.violeta400, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {editingColegio ? "Guardar cambios" : "Crear colegio"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
