import { type ChangeEvent } from "react";
import Table from "../../components/Table";
import COLORS from "../../utils/Colors";
import ActionButton from "../ActionButton";

export interface EstudianteTablaRow {
  estudianteId: string;
  nombreCompleto: string;
  curp: string | null;
  grupoId: string;
  grupoNombre: string;
  todoCompletado: boolean;
  archivoReporte: string | null;
}

export default function DetalleAnalisisEstudiantes({
  estudiantes,
  loading,
  onClose,
  onUploadReporte,
}: {
  estudiantes: EstudianteTablaRow[];
  loading?: boolean;
  onClose: () => void;
  onUploadReporte: (grupoId: string, estudianteId: string, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Estudiantes de la evaluación</h3>
          <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 2 }}>{estudiantes.length} estudiantes registrados</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <Table
          columns={[
            {
              key: "nombre",
              header: "Nombre",
              render: estudiante => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: COLORS.neutro900, fontWeight: 600 }}>{estudiante.nombreCompleto}</span>
                  <span style={{ color: COLORS.neutro500, fontSize: 12 }}>{estudiante.curp ?? "Sin CURP"}</span>
                </div>
              ),
            },
            { key: "grupoNombre", header: "Grupo", render: estudiante => <span style={{ color: COLORS.neutro700 }}>{estudiante.grupoNombre}</span> },
            {
              key: "encuestas",
              header: "Encuestas",
              render: estudiante => (
                <span style={{ fontSize: 12, color: estudiante.todoCompletado ? COLORS.verde600 : COLORS.ambar600 }}>
                  {estudiante.todoCompletado ? "Completas" : "En proceso"}
                </span>
              ),
            },
            {
              key: "reporte",
              header: "Reporte",
              render: estudiante => (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: estudiante.archivoReporte ? COLORS.verde600 : COLORS.neutro500 }}>
                    {estudiante.archivoReporte ? "Reporte subido" : "Sin reporte subido"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={event => onUploadReporte(estudiante.grupoId, estudiante.estudianteId, event)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              ),
            },
          ]}
          data={estudiantes}
          getRowKey={estudiante => estudiante.estudianteId}
          emptyState={loading ? "Cargando estudiantes..." : "No hay estudiantes registrados aún."}
          rowStyle={() => ({ borderTop: `1px solid ${COLORS.neutro50}` })}
        />
      </div>
    </div>
  );
}
