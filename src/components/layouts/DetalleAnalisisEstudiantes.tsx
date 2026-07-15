import { type ChangeEvent } from "react";
import Table from "../../components/Table";
import COLORS from "../../utils/Colors";

// ── Tipos ────────────────────────────────────────────────────
interface EstudianteGrupo {
  id: number;
  nombre: string;
  curp: string;
  reporte?: string;
  respuestas?: string[];
}

interface EstudianteTablaRow extends EstudianteGrupo {
  grupoNombre: string;
  grupoId: number;
  respuestas: string[];
}

export default function DetalleAnalisisEstudiantes({
  estudiantes,
  onClose,
  onUploadReporte,
}: {
  estudiantes: EstudianteTablaRow[];
  onClose: () => void;
  onUploadReporte: (grupoId: number, estudianteId: number, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Estudiantes del instituto</h3>
          <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 2 }}>{estudiantes.length} estudiantes registrados</div>
        </div>
        <button
          onClick={onClose}
          style={{ border: "none", background: "transparent", color: COLORS.neutro500, cursor: "pointer", fontSize: 14 }}
        >
          Ocultar
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <Table
          columns={[
            {
              key: "nombre",
              header: "Nombre",
              render: estudiante => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: COLORS.neutro900, fontWeight: 600 }}>{estudiante.nombre}</span>
                  <span style={{ color: COLORS.neutro500, fontSize: 12 }}>{estudiante.curp}</span>
                </div>
              ),
            },
            { key: "grupoNombre", header: "Grupo", render: estudiante => <span style={{ color: COLORS.neutro700 }}>{estudiante.grupoNombre}</span> },
            {
              key: "reporte",
              header: "Reporte",
              render: estudiante => (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: estudiante.reporte ? COLORS.verde600 : COLORS.neutro500 }}>
                    {estudiante.reporte ? estudiante.reporte : "Sin reporte subido"}
                  </span>
                  <input
                    type="file"
                    onChange={event => onUploadReporte(estudiante.grupoId, estudiante.id, event)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              ),
            },
          ]}
          data={estudiantes}
          getRowKey={estudiante => `${estudiante.grupoId}-${estudiante.id}`}
          emptyState="No hay estudiantes registrados aún."
          rowStyle={() => ({ borderTop: `1px solid ${COLORS.neutro50}` })}
        />
      </div>
    </div>
  );
}