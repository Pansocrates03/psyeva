import { useState, type ComponentProps } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ActionButton from "../components/ActionButton";
import Modal from "../components/Modal";
import EstadoBadge from "../components/EstadoBadge";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
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
  const navigate = useNavigate();

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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, color: COLORS.neutro900 }}>Evaluaciones</h1>
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
            Crear evaluación
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <StatCard label="Todos"      value={ANALISIS_DATA.length} onClick={() => setFiltro("todos")} accent={filtro === "todos"} />
          <StatCard label="Activos"    value={activos.length} onClick={() => setFiltro("activos")} accent={filtro === "activos"} />
          <StatCard label="Archivados" value={archivados.length} onClick={() => setFiltro("archivados")} accent={filtro === "archivados"} />
        </div>

        <div style={{
          background: "#fff",
          border: `1px solid ${COLORS.neutro100}`,
          borderRadius: 14,
          overflow: "hidden",
        }}>

          <Table
            columns={[
              {
                key: "colegio",
                header: "Colegio",
                render: item => (
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
                ),
              },
              {
                key: "estado",
                header: "Estado",
                render: item => <EstadoBadge estado={item.estado as ComponentProps<typeof EstadoBadge>["estado"]} />,
              },
              {
                key: "fecha",
                header: "Fecha",
                render: item => <span style={{ color: COLORS.neutro500 }}>{item.fecha}</span>,
              },
              {
                key: "acciones",
                header: "Acciones",
                align: "right",
                render: item => (
                  <div data-no-row-click="true" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {item.estado === "activo"
                      ? <ActionButton label="Archivar" variant="archive" />
                      : <ActionButton label="Eliminar" variant="danger" />
                    }
                  </div>
                ),
              },
            ]}
            data={filtrados}
            getRowKey={item => item.id}
            onRowClick={item => navigate(`/analisis/${item.id}`)}
            emptyState="No hay análisis para mostrar."
          />

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

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div style={{ fontSize: 14, color: COLORS.neutro700 }}>Contenido del modal temporal.</div>
        </Modal>
      )}
    </div>
  );
}