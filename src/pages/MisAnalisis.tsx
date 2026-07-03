import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import EstadoBadge from "../components/EstadoBadge";
import StatCard from "../components/StatCard";
import COLORS from "../utils/Colors";


const ANALISIS_DATA = [
  { id: 1, colegio: "Colegio Nuevo Continente", estado: "activo",    fecha: "14 de noviembre de 2026" },
  { id: 2, colegio: "Instituto Irlanda",         estado: "activo",    fecha: "2 de diciembre de 2026" },
  { id: 3, colegio: "Tec de Monterrey",          estado: "activo",    fecha: "14 de noviembre de 2026" },
  { id: 4, colegio: "Campamento Kikiwaka",       estado: "activo",    fecha: "2 de diciembre de 2026" },
  { id: 5, colegio: "Colegio Nuevo Continente",  estado: "archivado", fecha: "14 de noviembre de 2026" },
  { id: 6, colegio: "Instituto Irlanda",          estado: "archivado", fecha: "2 de diciembre de 2026" },
  { id: 7, colegio: "Tec de Monterrey",           estado: "archivado", fecha: "14 de noviembre de 2026" },
  { id: 8, colegio: "Instituto Irlanda",          estado: "archivado", fecha: "2 de diciembre de 2026" },
  { id: 9, colegio: "Campamento Kikiwaka",        estado: "archivado", fecha: "14 de noviembre de 2026" },
  { id: 10, colegio: "Colegio Nuevo Continente", estado: "archivado", fecha: "2 de diciembre de 2026" },
];

export default function MisAnalisis() {
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  const activos   = ANALISIS_DATA.filter(a => a.estado === "activo");
  const archivados = ANALISIS_DATA.filter(a => a.estado === "archivado");

  const filtrados = filtro === "activos"    ? activos
                  : filtro === "archivados" ? archivados
                  : ANALISIS_DATA;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, color: COLORS.neutro900 }}>Mis análisis</h1>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 8,
              background: COLORS.violeta400, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Crear análisis
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Todos"      value={ANALISIS_DATA.length} accent />
          <StatCard label="Activos"    value={activos.length} />
          <StatCard label="Archivados" value={archivados.length} />
        </div>

        <div style={{
          background: "#fff",
          border: `1px solid ${COLORS.neutro100}`,
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: `1px solid ${COLORS.neutro100}`,
          }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "todos",      label: "Todos" },
                { key: "activos",    label: "Activos" },
                { key: "archivados", label: "Archivados" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  style={{
                    padding: "5px 14px", borderRadius: 6, fontSize: 13,
                    fontWeight: filtro === f.key ? 500 : 400,
                    background: filtro === f.key ? COLORS.violeta50 : "transparent",
                    color: filtro === f.key ? COLORS.violeta600 : COLORS.neutro500,
                    border: filtro === f.key ? `1px solid ${COLORS.violeta100}` : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: COLORS.neutro400 }} aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar colegio..."
                style={{
                  border: `1px solid ${COLORS.neutro100}`,
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 13,
                  color: COLORS.neutro900,
                  outline: "none",
                  width: 180,
                }}
              />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: COLORS.neutro50 }}>
                {["Colegio", "Estado", "Fecha", "Acciones"].map((h, i) => (
                  <th key={h} style={{
                    padding: "10px 20px",
                    textAlign: i === 3 ? "right" : "left",
                    fontSize: 12,
                    fontWeight: 500,
                    color: COLORS.neutro500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${COLORS.neutro100}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: idx < filtrados.length - 1 ? `1px solid ${COLORS.neutro50}` : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.neutro50}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "13px 20px", fontSize: 14, color: COLORS.neutro900, fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: COLORS.violeta50,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <i className="ti ti-school" style={{ fontSize: 14, color: COLORS.violeta400 }} aria-hidden="true" />
                      </div>
                      {item.colegio}
                    </div>
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <EstadoBadge estado={item.estado} />
                  </td>
                  <td style={{ padding: "13px 20px", fontSize: 14, color: COLORS.neutro500 }}>
                    {item.fecha}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <ActionButton label="Editar" variant="default" />
                      {item.estado === "activo"
                        ? <ActionButton label="Archivar" variant="archive" />
                        : <ActionButton label="Eliminar" variant="danger" />
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            padding: "12px 20px",
            borderTop: `1px solid ${COLORS.neutro100}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: COLORS.neutro500 }}>
              Mostrando {filtrados.length} de {ANALISIS_DATA.length} análisis
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2].map(p => (
                <button key={p} style={{
                  width: 30, height: 30, borderRadius: 6, fontSize: 13,
                  background: p === 1 ? COLORS.violeta400 : "transparent",
                  color: p === 1 ? "#fff" : COLORS.neutro500,
                  border: p === 1 ? "none" : `1px solid ${COLORS.neutro100}`,
                  cursor: "pointer",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </div>
  );
}