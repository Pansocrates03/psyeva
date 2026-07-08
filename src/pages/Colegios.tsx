import { useMemo, useState, type FormEvent } from "react";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import COLORS from "../utils/Colors";

type EstadoColegio = "activo" | "en revisión" | "inactivo";

interface Colegio {
  id: number;
  nombre: string;
  ciudad: string;
  director: string;
  estudiantes: number;
  estado: EstadoColegio;
  fecha: string;
}

interface FormState {
  nombre: string;
  ciudad: string;
  director: string;
  estudiantes: string;
  estado: EstadoColegio;
}

const INITIAL_COLEGIOS: Colegio[] = [
  { id: 1, nombre: "Colegio Nuevo Continente", ciudad: "Bogotá", director: "Marta Sánchez", estudiantes: 820, estado: "activo", fecha: "14 nov 2026" },
  { id: 2, nombre: "Instituto Irlanda", ciudad: "Medellín", director: "Carlos Ruiz", estudiantes: 640, estado: "activo", fecha: "2 dic 2026" },
  { id: 3, nombre: "Liceo de la Esperanza", ciudad: "Cali", director: "Lucía Torres", estudiantes: 310, estado: "en revisión", fecha: "9 ene 2027" },
  { id: 4, nombre: "Colegio San José", ciudad: "Barranquilla", director: "Andrés Paredes", estudiantes: 480, estado: "inactivo", fecha: "21 mar 2026" },
];

const ESTADO_META: Record<EstadoColegio, { label: string; bg: string; color: string; border: string }> = {
  activo: { label: "Activo", bg: COLORS.verde50, color: COLORS.verde600, border: COLORS.verde100 },
  "en revisión": { label: "En revisión", bg: COLORS.ambar50, color: COLORS.ambar600, border: "#FDEFC0" },
  inactivo: { label: "Inactivo", bg: COLORS.rojo50, color: COLORS.rojo600, border: "#FFC9C9" },
};

const emptyForm = (): FormState => ({
  nombre: "",
  ciudad: "",
  director: "",
  estudiantes: "",
  estado: "activo",
});

export default function Colegios() {
  const [colegios, setColegios] = useState<Colegio[]>(INITIAL_COLEGIOS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColegio, setEditingColegio] = useState<Colegio | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [query, setQuery] = useState("");

  const filteredColegios = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colegios;
    return colegios.filter(colegio =>
      [colegio.nombre, colegio.ciudad, colegio.director].some(value => value.toLowerCase().includes(q))
    );
  }, [colegios, query]);

  const totalEstudiantes = colegios.reduce((sum, colegio) => sum + colegio.estudiantes, 0);
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
      ciudad: colegio.ciudad,
      director: colegio.director,
      estudiantes: String(colegio.estudiantes),
      estado: colegio.estado,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.ciudad.trim() || !form.director.trim()) {
      return;
    }

    const payload: Colegio = {
      id: editingColegio?.id ?? Date.now(),
      nombre: form.nombre.trim(),
      ciudad: form.ciudad.trim(),
      director: form.director.trim(),
      estudiantes: Number(form.estudiantes) || 0,
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
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Estudiantes</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{totalEstudiantes}</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: COLORS.neutro500, marginBottom: 6 }}>Activos</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.neutro900 }}>{activos}</div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Listado de colegios</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-search" style={{ fontSize: 15, color: COLORS.neutro400 }} aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar colegio..."
                style={{
                  border: `1px solid ${COLORS.neutro100}`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 13,
                  color: COLORS.neutro900,
                  outline: "none",
                  width: 200,
                }}
              />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.neutro50 }}>
                {[
                  { label: "Colegio", align: "left" },
                  { label: "Ciudad", align: "left" },
                  { label: "Director", align: "left" },
                  { label: "Estudiantes", align: "left" },
                  { label: "Estado", align: "left" },
                  { label: "Acciones", align: "right" },
                ].map(column => (
                  <th key={column.label} style={{ padding: "10px 20px", textAlign: column.align as "left" | "right", fontSize: 12, fontWeight: 600, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${COLORS.neutro100}` }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredColegios.map((colegio, index) => {
                const meta = ESTADO_META[colegio.estado];
                return (
                  <tr key={colegio.id} style={{ borderBottom: index < filteredColegios.length - 1 ? `1px solid ${COLORS.neutro50}` : "none" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 600, color: COLORS.neutro900 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.violeta50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="ti ti-school" style={{ fontSize: 16, color: COLORS.violeta400 }} aria-hidden="true" />
                        </div>
                        <div>
                          <div>{colegio.nombre}</div>
                          <div style={{ fontSize: 12, color: COLORS.neutro500 }}>Creado {colegio.fecha}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", color: COLORS.neutro700 }}>{colegio.ciudad}</td>
                    <td style={{ padding: "14px 20px", color: COLORS.neutro700 }}>{colegio.director}</td>
                    <td style={{ padding: "14px 20px", color: COLORS.neutro700 }}>{colegio.estudiantes}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ display: "inline-flex", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <ActionButton label="Editar" onClick={() => openEditModal(colegio)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Ciudad</label>
                <input
                  value={form.ciudad}
                  onChange={event => setForm(prev => ({ ...prev, ciudad: event.target.value }))}
                  placeholder="Ej. Bogotá"
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Estudiantes</label>
                <input
                  type="number"
                  min="0"
                  value={form.estudiantes}
                  onChange={event => setForm(prev => ({ ...prev, estudiantes: event.target.value }))}
                  placeholder="0"
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 8, fontSize: 14, color: COLORS.neutro900, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>Director</label>
              <input
                value={form.director}
                onChange={event => setForm(prev => ({ ...prev, director: event.target.value }))}
                placeholder="Ej. Ana García"
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
